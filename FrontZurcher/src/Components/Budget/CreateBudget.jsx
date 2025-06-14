import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import { Viewer, Worker } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/solid';
import { unwrapResult } from '@reduxjs/toolkit';
import { fetchBudgetItems } from "../../Redux/Actions/budgetItemActions";
import { fetchPermitById } from "../../Redux/Actions/permitActions";
import { createBudget } from "../../Redux/Actions/budgetActions";
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";
import Swal from 'sweetalert2';
import DynamicCategorySection from "./DynamicCategorySection";

// --- Helper para generar IDs temporales ---
const generateTempId = () => `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// --- Helper para formatear fecha a MM-DD-YYYY ---
const formatDateMMDDYYYY = (isoDateString) => {
  if (!isoDateString || typeof isoDateString !== 'string') {
    return ''; // Devuelve vacío si no hay fecha o no es string
  }
  try {
    // Asegurarse de que la fecha se interprete correctamente (UTC para evitar problemas de zona horaria)
    const date = new Date(isoDateString + 'T00:00:00Z');
    if (isNaN(date.getTime())) {
      return ''; // Devuelve vacío si la fecha no es válida
    }
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${month}-${day}-${year}`;
  } catch (error) {
    console.error("Error formatting date:", error);
    return ''; // Devuelve vacío en caso de error
  }
};
// --- Hook para leer Query Params ---
function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const CreateBudget = () => {
  const query = useQuery();
  const permitIdFromQuery = query.get("permitId");

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const defaultLayoutPluginInstance = defaultLayoutPlugin();

  // --- Estado del Catálogo y Carga ---
  const { items: budgetItemsCatalog = [], loading: loadingCatalog, error: errorCatalog } = useSelector(state => state.budgetItems) || {};
  console.log("Catálogo de items:", budgetItemsCatalog);

  // --- Estado del Permit seleccionado ---
  const { selectedPermit, loading: loadingPermit, error: errorPermit } = useSelector(state => state.permit) || {};
  console.log("Permit seleccionado:", selectedPermit);
  const [permitExpirationAlert, setPermitExpirationAlert] = useState({ type: "", message: "" });
  const [pdfPreview, setPdfPreview] = useState(null);
  const [optionalDocPreview, setOptionalDocPreview] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false); // Estado para deshabilitar botón
  const [createdBudgetInfo, setCreatedBudgetInfo] = useState(null); // Para guardar info del budget creado
 
  // Define standard input classes for reuse
  const standardInputClasses = "mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm";
  const readOnlyInputClasses = "mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm sm:text-sm cursor-default";

  //estados items manual 
  const [manualItem, setManualItem] = useState({
    category: "",
    name: "",
    unitPrice: 0,
    quantity: 1,
    description: "", // Added description field
  });
  const [normalizedBudgetItemsCatalog, setNormalizedBudgetItemsCatalog] = useState([]);

  useEffect(() => {
    const normalizedCatalog = budgetItemsCatalog
      .filter(item => item.isActive && item.category) // Filtrar solo items activos y con categoría válida
      .map(item => ({
        ...item,
        category: item.category?.toUpperCase().trim() || '',
        name: item.name?.toUpperCase().trim() || '',
        marca: item.marca?.toUpperCase().trim() || '',
        capacity: item.capacity?.toUpperCase().trim() || '',
      }));
    console.log("Categorías disponibles:", [...new Set(normalizedCatalog.map(item => item.category))]);
    setNormalizedBudgetItemsCatalog(normalizedCatalog);
  }, [budgetItemsCatalog]);

  // --- Estado para visibilidad de secciones de items ---
  const [sectionVisibility, setSectionVisibility] = useState({
    manualItem: false, 
  });
  
  const toggleSection = (sectionName) => {
    setSectionVisibility(prev => ({ ...prev, [sectionName]: !prev[sectionName] }));
  };

  // --- Estado del Formulario (Inicializado para creación) ---
  const [formData, setFormData] = useState({
    permitNumber: "",
    propertyAddress: "",
    applicantName: "",
    lot: "",
    block: "",
    date: new Date().toISOString().split('T')[0],
    expirationDate: "", // Se calculará automáticamente
    initialPayment: 0,
    status: "created", // Estado inicial por defecto
    discountDescription: "",
    discountAmount: 0,
    generalNotes: "",
    lineItems: [],
    subtotalPrice: 0,
    totalPrice: 0,
    initialPaymentPercentage: '60',
    excavationRequired: "",
    drainfieldDepth: "",
    systemType: "",
  });

  // --- Cargar Datos Iniciales (Catálogo y Permit) ---
  useEffect(() => {
    // Siempre cargar catálogo
    dispatch(fetchBudgetItems());

    // Cargar Permit si hay ID en la query
    if (permitIdFromQuery) {
      console.log(`Modo Creación: Cargando Permit ID ${permitIdFromQuery}`);
      dispatch(fetchPermitById(permitIdFromQuery));
    } else {
      console.warn("No se proporcionó permitId en la URL para crear el presupuesto.");
      // Opcional: Redirigir o mostrar un mensaje si el permitId es obligatorio
      // navigate('/ruta-error');
      // alert("Se requiere un ID de permiso para crear un presupuesto.");
    }
  }, [dispatch, permitIdFromQuery]); // Dependencias simplificadas

  // --- Efecto para poblar el formulario cuando el Permit carga ---
  useEffect(() => {
    console.log("Effect para poblar formulario ejecutado. selectedPermit:", selectedPermit);
    if (selectedPermit && selectedPermit.idPermit === permitIdFromQuery) { // Asegurarse que es el permit correcto
      console.log("Poblando formulario desde Permit:", selectedPermit);
      setFormData(prev => ({
        ...prev,
        permitNumber: selectedPermit.permitNumber || "",
        propertyAddress: selectedPermit.propertyAddress || "",
        applicantName: selectedPermit.applicantName || selectedPermit.applicant || "", // Considerar ambos campos
        lot: selectedPermit.lot || "",
        block: selectedPermit.block || "",
        // Resetear campos específicos del budget al cargar nuevo permit
        lineItems: [],
        discountAmount: 0,
        discountDescription: "",
        generalNotes: "",
        initialPayment: 0,
        date: new Date().toISOString().split('T')[0], // Resetear fecha a hoy
        expirationDate: "", // Se recalculará
        status: "created",
        initialPaymentPercentage: '60',
         excavationRequired: selectedPermit.excavationRequired || "",
         drainfieldDepth: selectedPermit.drainfieldDepth || "",
         systemType: selectedPermit.systemType || "",
      }));

       // --- Establecer alerta de expiración del Permit ---
       if (selectedPermit.expirationStatus === "expired" || selectedPermit.expirationStatus === "soon_to_expire") {
        setPermitExpirationAlert({
          type: selectedPermit.expirationStatus === "expired" ? "error" : "warning",
          message: selectedPermit.expirationMessage || 
                   (selectedPermit.expirationStatus === "expired" 
                     ? "El permiso asociado está VENCIDO." 
                     : "El permiso asociado está PRÓXIMO A VENCER.")
        });
      } else if (selectedPermit.expirationStatus === "valid") {
        setPermitExpirationAlert({ type: "", message: "" }); // Limpiar alerta si es válido
      } else if (!selectedPermit.expirationStatus && selectedPermit.expirationDate) {
        // Fallback si expirationStatus no vino pero sí la fecha, recalcular simple
        const today = new Date(); today.setHours(0,0,0,0);
        const expDatePermit = new Date(selectedPermit.expirationDate + 'T00:00:00Z');
        if (!isNaN(expDatePermit.getTime())) {
            if (expDatePermit < today) {
                 setPermitExpirationAlert({type: "error", message: `El permiso asociado expiró el ${expDatePermit.toLocaleDateString()}.`});
            }
        }
      }
      // Poblar campos específicos desde el Permit
      // if (selectedPermit.drainfieldDepth) {
      //   setDrainfieldSelection(prev => ({
      //     ...prev,
      //     sf: selectedPermit.drainfieldDepth,
      //   }));
      // }

      // if (selectedPermit.systemType) {
      //   setSystemTypeSelection(prev => ({
      //     ...prev,
      //     type: selectedPermit.systemType.includes("ATU") ? "ATU" : "REGULAR",
      //   }));
      // }

      // if (selectedPermit.excavationRequired) {
      //   setFormData(prev => ({
      //     ...prev,
      //     excavationRequired: selectedPermit.excavationRequired,
      //   }));
      // }

      // Mostrar PDFs del Permit
      if (selectedPermit.pdfData) { // Asumiendo que ahora viene como URL
        setPdfPreview(selectedPermit.pdfData.data);
      } else {
        setPdfPreview(null); // Limpiar si no hay PDF
      }
      if (selectedPermit.optionalDocs) { // Asumiendo que ahora viene como URL
        setOptionalDocPreview(selectedPermit.optionalDocs.data);
      } else {
        setOptionalDocPreview(null); // Limpiar si no hay doc opcional
      }
    } else if (!permitIdFromQuery && !loadingPermit) { 
      setPermitExpirationAlert({ type: "error", message: "No se ha cargado la información del permiso." });
  }
  }, [selectedPermit, permitIdFromQuery, loadingPermit]); // Dependencias ajustadas

  // --- Calcular Totales (Subtotal, Total, Initial Payment) ---
  useEffect(() => {
    const subtotal = formData.lineItems.reduce((sum, item) => {
      const lineTotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0);
      return sum + lineTotal;
    }, 0);

    const total = subtotal - (parseFloat(formData.discountAmount) || 0);

    let payment = 0;
    const percentage = parseFloat(formData.initialPaymentPercentage);
    if (!isNaN(percentage)) {
      payment = (total * percentage) / 100;
    } else if (formData.initialPaymentPercentage === 'total') {
      payment = total;
    }

    // Evitar re-renderizado innecesario si los valores no cambian
    if (subtotal !== formData.subtotalPrice || total !== formData.totalPrice || payment !== formData.initialPayment) {
      setFormData(prev => ({
        ...prev,
        subtotalPrice: subtotal,
        totalPrice: total,
        initialPayment: payment,
      }));
    }
  }, [formData.lineItems, formData.discountAmount, formData.initialPaymentPercentage, formData.subtotalPrice, formData.totalPrice, formData.initialPayment]); // Añadidas dependencias calculadas

  // --- Effect para calcular Expiration Date siempre que Date cambie ---
  useEffect(() => {
    if (formData.date) {
      try {
        const startDate = new Date(formData.date + 'T00:00:00');
        if (!isNaN(startDate.getTime())) {
          const expiration = new Date(startDate);
          expiration.setDate(startDate.getDate() + 30);
          const expirationString = expiration.toISOString().split('T')[0];
          if (expirationString !== formData.expirationDate) {
            setFormData(prev => ({ ...prev, expirationDate: expirationString }));
          }
        } else if (formData.expirationDate !== "") {
          setFormData(prev => ({ ...prev, expirationDate: "" }));
        }
      } catch (error) {
        console.error("Error calculating expiration date:", error);
        if (formData.expirationDate !== "") {
          setFormData(prev => ({ ...prev, expirationDate: "" }));
        }
      }
    } else if (formData.expirationDate !== "") {
      setFormData(prev => ({ ...prev, expirationDate: "" }));
    }
  }, [formData.date, formData.expirationDate]); // Añadida dependencia expirationDate




  // --- Handlers para Inputs Generales ---
  const handleGeneralInputChange = (e) => {
    const { name, value } = e.target;
    const isNumeric = ['discountAmount'].includes(name);
    setFormData(prev => ({
      ...prev,
      [name]: isNumeric ? parseFloat(value) || 0 : value,
    }));
  };

  const handlePaymentPercentageChange = (e) => {
    setFormData(prev => ({ ...prev, initialPaymentPercentage: e.target.value }));
  };

  // --- Función addOrUpdateLineItem (Modificada para reemplazar opcionalmente) ---
  const addOrUpdateLineItem = (itemDetails, replaceIfExists = false) => {
    console.log("Buscando item con:", itemDetails);

    // Buscar el item en el catálogo
    const foundItem = normalizedBudgetItemsCatalog.find(catalogItem => {
      let match = catalogItem.category === itemDetails.category?.toUpperCase();
      if (match && itemDetails.name !== undefined) match = catalogItem.name === itemDetails.name?.toUpperCase();
      if (match && itemDetails.marca !== undefined) match = (catalogItem.marca || '') === (itemDetails.marca?.toUpperCase() || '');
      if (match && itemDetails.capacity !== undefined) match = (catalogItem.capacity || '') === (itemDetails.capacity?.toUpperCase() || '');
      return match;
    });

    if (!foundItem) {
      alert(`No se encontró un item en el catálogo para: ${itemDetails.category} - ${itemDetails.name || ''} - ${itemDetails.marca || ''} - ${itemDetails.capacity || ''}`);
      console.error("No se encontró item para:", itemDetails, "en", normalizedBudgetItemsCatalog);
      return;
    }

    console.log("Item encontrado en catálogo:", foundItem);

    setFormData(prev => {
      const existingItemIndex = prev.lineItems.findIndex(line => line.budgetItemId === foundItem.id);
      let newLineItems;
      const newItemData = {
        _tempId: generateTempId(),
        budgetItemId: foundItem.id,
        quantity: parseFloat(itemDetails.quantity) || 1,
        notes: itemDetails.notes || '',
        name: foundItem.name,
        category: foundItem.category,
        marca: foundItem.marca || '',
        capacity: foundItem.capacity || '',
        unitPrice: parseFloat(foundItem.unitPrice) || 0,
      };

      if (existingItemIndex > -1) {
        console.log("Item existente encontrado en índice:", existingItemIndex);
        newLineItems = [...prev.lineItems];
        if (replaceIfExists) {
          newItemData._tempId = newLineItems[existingItemIndex]._tempId;
          newLineItems[existingItemIndex] = newItemData;
        } else {
          const currentItem = newLineItems[existingItemIndex];
          const newQuantity = (parseFloat(currentItem.quantity) || 0) + (parseFloat(itemDetails.quantity) || 0);
          newLineItems[existingItemIndex] = { ...currentItem, quantity: newQuantity, notes: itemDetails.notes || currentItem.notes };
        }
      } else {
        console.log("Añadiendo nuevo item.");
        newLineItems = [...prev.lineItems, newItemData];
      }
      return { ...prev, lineItems: newLineItems };
    });
  };

  const handleRemoveItem = (tempIdToRemove) => {
    setFormData(prev => ({
      ...prev,
      lineItems: prev.lineItems.filter(item => item._tempId !== tempIdToRemove)
    }));
  };

  //handle item manual
  const handleManualItemChange = (e) => {
    const { name, value } = e.target;
    const isNumeric = ['unitPrice', 'quantity'].includes(name);
    setManualItem(prev => ({
      ...prev,
      [name]: isNumeric ? parseFloat(value) || 0 : value,
    }));
  };

  const addManualItem = () => {
    if (!manualItem.category || !manualItem.name || manualItem.unitPrice <= 0 || manualItem.quantity <= 0) {
      alert("Por favor complete todos los campos del item manual.");
      return;
    }

    setFormData(prev => ({
      ...prev,
      lineItems: [...prev.lineItems, {
        _tempId: generateTempId(),
        budgetItemId: null, // Item personalizado
        category: manualItem.category.toUpperCase(),
        name: manualItem.name.toUpperCase(),
        unitPrice: manualItem.unitPrice,
        quantity: manualItem.quantity,
        description: manualItem.description, // Added description
        notes: "Item Manual", // You might want to adjust notes or use description for this
      }],
    }));

    // Resetear el formulario del item manual
    setManualItem({ category: "", name: "", unitPrice: 0, quantity: 1, description: "" }); // Reset description
  };


 // --- Obtener todas las categorías disponibles dinámicamente ---
  const availableCategories = useMemo(() => {
    const categories = [...new Set(normalizedBudgetItemsCatalog.map(item => item.category))].sort();
    console.log("Categorías detectadas automáticamente:", categories);
    return categories;
  }, [normalizedBudgetItemsCatalog]);

  // --- Estado para visibilidad de secciones dinámicas ---
  const [dynamicSectionVisibility, setDynamicSectionVisibility] = useState({});

  // Inicializar visibilidad para nuevas categorías
  useEffect(() => {
    const newVisibility = {};
    availableCategories.forEach(category => {
      if (!(category in dynamicSectionVisibility)) {
        newVisibility[category] = false; // Por defecto cerradas
      }
    });
    if (Object.keys(newVisibility).length > 0) {
      setDynamicSectionVisibility(prev => ({ ...prev, ...newVisibility }));
    }
  }, [availableCategories, dynamicSectionVisibility]);

  const toggleDynamicSection = (category) => {
    setDynamicSectionVisibility(prev => ({ 
      ...prev, 
      [category]: !prev[category] 
    }));
  };

  // --- Función para agregar items desde secciones dinámicas ---
  const addItemFromDynamicSection = (itemData) => {
    if (itemData.budgetItemId === null) {
      // Item personalizado - agregar directamente
      setFormData(prev => ({
        ...prev,
        lineItems: [...prev.lineItems, itemData],
      }));
    } else {
      // Item del catálogo - usar la función existente
      addOrUpdateLineItem(itemData);
    }
  };



  // --- Submit Handler (Solo Crear) ---
  const handleSubmit = async (e) => {
    e.preventDefault();
     // Aunque permitamos crear, podríamos mostrar una confirmación extra si el permiso está vencido
     if (permitExpirationAlert.type === 'error') {
      const confirmExpired = await Swal.fire({
          title: 'Permiso Vencido',
          text: `${permitExpirationAlert.message} ¿Estás seguro de que deseas crear un presupuesto para este permiso vencido?`,
          icon: 'warning', // Usar warning para confirmación, no error para no bloquear
          showCancelButton: true,
          confirmButtonColor: '#3085d6',
          cancelButtonColor: '#d33',
          confirmButtonText: 'Sí, crear presupuesto',
          cancelButtonText: 'Cancelar'
      });
      if (!confirmExpired.isConfirmed) {
          setIsSubmitting(false);
          return; // Detener si el usuario cancela
      }
  }
    setIsSubmitting(true); // Deshabilitar botón
    setCreatedBudgetInfo(null); // Limpiar info previa

    if (!permitIdFromQuery) {
      alert("Error: No se encontró el ID del permiso asociado.");
      setIsSubmitting(false);
      return;
    }
    if (formData.lineItems.length === 0) {
      alert("Debe añadir al menos un item al presupuesto.");
      setIsSubmitting(false);
      return;
    }

    // Preparar datos para la creación del presupuesto
    const dataToSend = {
      permitId: permitIdFromQuery, // Asegúrate que este es el nombre correcto esperado por el backend
      date: formData.date,
      expirationDate: formData.expirationDate || null,
      status: formData.status, // Enviar el estado ('created' o el que sea)
      discountDescription: formData.discountDescription,
      discountAmount: formData.discountAmount,
      generalNotes: formData.generalNotes,
      initialPaymentPercentage: formData.initialPaymentPercentage,
      lineItems: formData.lineItems.map(item => ({
        budgetItemId: item.budgetItemId || null,
        quantity: item.quantity,
        notes: item.notes || null,
        // Enviar datos de item manual si es necesario
        ...(item.budgetItemId === null && {
          category: item.category,
          name: item.name,
          unitPrice: item.unitPrice, // El backend usará este
          description: item.description || null, // Added description field
        }),
        // Enviar otros campos si el backend los espera
        marca: item.marca || null,
        capacity: item.capacity || null,
        // priceAtTimeOfBudget y unitPrice (para items de catálogo) los determinará el backend
      })),
      // No enviar totales, el backend los calcula
    };

    console.log("Enviando al backend para CREAR:", dataToSend);

    try {
      // Llamar a la acción createBudget
      const resultAction = await dispatch(createBudget(dataToSend));
      const newBudget = unwrapResult(resultAction); // Obtener el budget creado desde la respuesta

      console.log("Presupuesto creado exitosamente por backend:", newBudget);

     

      // Guardar la información del budget creado (incluyendo la URL del PDF)
      setCreatedBudgetInfo(newBudget);

      alert(`Presupuesto #${newBudget.idBudget} creado exitosamente.`);
      // Opcional: No navegar inmediatamente, permitir descargar primero
       navigate('/budgets');

    } catch (error) {
      console.error("Error al crear el presupuesto:", error);
      // Mostrar mensaje de error más detallado si viene del backend
      const errorMsg = error?.error || error?.message || "Error desconocido al crear el presupuesto.";
      alert(`Error al crear el presupuesto: ${errorMsg}`);
    } finally {
      setIsSubmitting(false); // Habilitar botón de nuevo
    }
  };


  // --- Render ---
  const isLoading = loadingCatalog || loadingPermit; // Solo depende de catálogo y permit
  const hasError = errorCatalog || errorPermit; // Solo depende de catálogo y permit

  if (isLoading && !hasError) return <div className="container mx-auto p-6 lg:p-8">Cargando datos...</div>;
  // Mostrar error específico si es posible
  if (errorPermit) return <div className="container mx-auto p-6 lg:p-8 text-red-600">Error cargando datos del permiso: {errorPermit}</div>;
  if (errorCatalog) return <div className="container mx-auto p-6 lg:p-8 text-red-600">Error cargando catálogo de items: {errorCatalog}</div>;
  // Si no hay permitId, mostrar mensaje
  if (!permitIdFromQuery && !isLoading) return <div className="container mx-auto p-6 lg:p-8 text-orange-600">No se especificó un permiso para crear el presupuesto. Verifique la URL.</div>;
  // Si el permit cargó pero no se encontró (error 404 simulado por selectedPermit null tras carga)
  if (!selectedPermit && !loadingPermit && permitIdFromQuery && !errorPermit) return <div className="container mx-auto p-6 lg:p-8 text-red-600">No se encontró el permiso con ID: {permitIdFromQuery}</div>;


  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1400px] mx-auto p-6 lg:p-8 space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 lg:gap-8">
          {/* Columna izquierda: Vista previa de los PDFs */}
          <div className="bg-white shadow-lg rounded-xl p-6 md:col-span-3"> {/* PDF viewer takes 3/5 of width on xl screens */}
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Vista previa de los PDFs del Permiso</h2>

            <div className="flex justify-center space-x-4 mb-6"> {/* Centrado y con espacio */}
              <button
                onClick={() => setCurrentPage(1)}
                className={`py-2 px-4 rounded-md text-sm font-medium transition-colors ${currentPage === 1 ? "bg-indigo-600 text-white shadow-sm" : "bg-gray-100 text-gray-700 hover:bg-gray-200"} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Ver PDF Principal
              </button>
              <button
                onClick={() => setCurrentPage(2)}
                className={`py-2 px-4 rounded-md text-sm font-medium transition-colors ${currentPage === 2 ? "bg-indigo-600 text-white shadow-sm" : "bg-gray-100 text-gray-700 hover:bg-gray-200"} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Ver Documento Opcional
              </button>
            </div>

            {/* Vista previa del PDF */}
            {currentPage === 1 && pdfPreview ? (
              <div className="overflow-y-auto max-h-[750px] border border-gray-200 rounded-lg shadow-inner bg-gray-50">
                <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
                  <Viewer
                    fileUrl={pdfPreview}
                    plugins={[defaultLayoutPluginInstance]}
                  />
                </Worker>
              </div>
            ) : currentPage === 2 && optionalDocPreview ? (
              <div className="overflow-y-auto max-h-[750px] border border-gray-200 rounded-lg shadow-inner bg-gray-50">
                <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
                  <Viewer
                    fileUrl={optionalDocPreview}
                    plugins={[defaultLayoutPluginInstance]}
                  />
                </Worker>
              </div>
            ) : (
              <p className="text-gray-500 py-10 text-center">
                {currentPage === 1
                  ? "No se ha cargado ningún PDF principal."
                  : "No se ha cargado ningún documento opcional."}
              </p>
            )}
          </div>

          {/* --- Formulario (Columna Derecha) --- */}
          <div className="bg-white shadow-lg rounded-xl p-6 md:col-span-2 space-y-6 max-h-[calc(100vh-8rem)] overflow-y-auto">
            <h2 className="text-2xl font-semibold text-gray-800 mb-2 text-center md:text-left sticky top-0 bg-white py-2 z-10">Crear Nuevo Presupuesto</h2> {/* Made title sticky */}
            <form onSubmit={handleSubmit} className="space-y-6">

            {/* --- Sección Información General (Grid within Space-y) --- */}
            <div className="grid grid-cols-4 gap-4 border-b pb-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-500">Permit Number</label>
                <p className="text-sm font-semibold text-gray-800">{formData.permitNumber || 'N/A'}</p>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-500">Applicant</label>
                <p className="text-sm font-semibold text-gray-800">{formData.applicantName || 'N/A'}</p>
              </div>
              <div className="col-span-full"> {/* Ajustado para ocupar todo el ancho */}
                <label className="block text-xs font-medium text-gray-500">Property Address</label>
                <p className="text-sm font-semibold text-gray-800">{formData.propertyAddress || 'N/A'}</p>
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-medium text-gray-500">Lot</label>
                <p className="text-sm font-semibold text-gray-800">{formData.lot || 'N/A'}</p>
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-medium text-gray-500">Block</label>
                <p className="text-sm font-semibold text-gray-800">{formData.block || 'N/A'}</p>
              </div>
              <div className="col-span-2"> {/* Ajustado para que no se monte con la alerta */}
                <label className="block text-xs font-medium text-gray-500">Excavation</label>
                <p className="text-sm font-semibold text-gray-800">{formData.excavationRequired || 'N/A'}</p>
              </div>
              <div className="col-span-1">
    <label className="block text-xs font-medium text-gray-500">Excavation</label>
    <p className="text-sm font-semibold text-gray-800">{formData.excavationRequired || 'N/A'}</p>
  </div>
  <div className="col-span-1">
    <label className="block text-xs font-medium text-gray-500">System Type</label>
    <p className="text-sm font-semibold text-gray-800">{formData.systemType || 'N/A'}</p>
  </div>

  {/* ✅ AGREGAMOS DRAINFIELD DEPTH SI QUIERES MOSTRARLO */}
  {formData.drainfieldDepth && (
    <div className="col-span-2">
      <label className="block text-xs font-medium text-gray-500">Drainfield Depth</label>
      <p className="text-sm font-semibold text-gray-800">{formData.drainfieldDepth}</p>
    </div>
  )}

              {/* --- ALERTA DE EXPIRACIÓN DEL PERMIT --- */}
              {permitExpirationAlert.message && (
                <div className={`col-span-4 mt-2 p-3 rounded-md border ${
                  permitExpirationAlert.type === 'error' ? 'bg-red-50 border-red-400 text-red-700' : 'bg-yellow-50 border-yellow-400 text-yellow-700'
                }`}>
                  <p className="font-bold text-sm">
                    {permitExpirationAlert.type === 'error' ? '¡Permiso Vencido!' : '¡Atención! Permiso Próximo a Vencer'}
                  </p>
                  <p className="text-xs">{permitExpirationAlert.message}</p>
                </div>
              )}
              {/* --- FIN ALERTA --- */}
              <div className="col-span-2">
                <label htmlFor="budget_date" className="block text-sm font-medium text-gray-700">Date</label>
                <input id="budget_date" type="date" name="date" value={formData.date} onChange={handleGeneralInputChange} required className="input-style" />
              </div>
              <div className="col-span-2">
                <label htmlFor="budget_expiration" className="block text-sm font-medium text-gray-700">Expiration Date</label>
                <input id="budget_expiration" type="text" name="expirationDate" value={formatDateMMDDYYYY(formData.expirationDate)} className="input-style bg-gray-100" readOnly />
              </div>
            </div>
           {/* // --- Sección Items Presupuestables (Collapsible) --- */}
            <div className="border p-3 rounded space-y-2 bg-gray-50">
              <h3 className="text-lg font-semibold text-center text-gray-700 mb-2">Añadir Items</h3>

             
          {/* --- Sección Items Presupuestables (Dinámicas) --- */}
      <div className="space-y-3"> {/* Removed redundant border and padding, parent has it */}
       
        {/* Generar secciones dinámicamente para cada categoría */}
        {availableCategories.map(category => (
          <DynamicCategorySection
            key={category}
            category={category}
            normalizedCatalog={normalizedBudgetItemsCatalog}
            isVisible={dynamicSectionVisibility[category] || false}
            onToggle={() => toggleDynamicSection(category)}
            onAddItem={addItemFromDynamicSection}
            generateTempId={generateTempId}
            // Pass standardInputClasses for consistent styling within DynamicCategorySection if it uses inputs
            // standardInputClasses={standardInputClasses} 
          />
        ))}

        {/* --- Item Manual (mantener como opción adicional) --- */}
        <div className="border border-gray-200 rounded-lg bg-white shadow-sm">
          <button 
            type="button" 
            onClick={() => toggleSection('manualItem')} 
            className="w-full flex justify-between items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-t-lg transition-colors"
          >
            <span className="font-medium text-sm text-gray-700">Añadir Item Manual</span> {/* Removed ➕ emoji */}
            {sectionVisibility.manualItem ? 
              <ChevronUpIcon className="h-5 w-5 text-gray-500" /> : 
              <ChevronDownIcon className="h-5 w-5 text-gray-500" />
            }
          </button>
          {sectionVisibility.manualItem && (
            <fieldset className="p-4 border-t border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"> {/* Made manual item form more responsive */}
                <div className="sm:col-span-1">
                  <label htmlFor="manual_category" className="block text-sm font-medium text-gray-700 mb-1">
                    Categoría
                  </label>
                  <input 
                    id="manual_category" 
                    type="text" 
                    name="category" 
                    value={manualItem.category} 
                    onChange={handleManualItemChange} 
                    placeholder="Ej: NUEVA CATEGORIA" 
                    className={standardInputClasses} 
                  />
                </div>
                <div className="sm:col-span-1">
                  <label htmlFor="manual_name" className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre
                  </label>
                  <input 
                    id="manual_name" 
                    type="text" 
                    name="name" 
                    value={manualItem.name} 
                    onChange={handleManualItemChange} 
                    placeholder="Ej: Item Especial" 
                    className={standardInputClasses} 
                  />
                </div>
                <div className="sm:col-span-1">
                  <label htmlFor="manual_price" className="block text-sm font-medium text-gray-700 mb-1">
                    Precio Unitario
                  </label>
                  <input 
                    id="manual_price" 
                    type="number" 
                    name="unitPrice" 
                    value={manualItem.unitPrice} 
                    onChange={handleManualItemChange} 
                    min="0" 
                    step="0.01" 
                    placeholder="0.00" 
                    className={standardInputClasses} 
                  />
                </div>
                <div className="sm:col-span-1">
                  <label htmlFor="manual_quantity" className="block text-sm font-medium text-gray-700 mb-1">
                    Cantidad
                  </label>
                  <input 
                    id="manual_quantity" 
                    type="number" 
                    name="quantity" 
                    value={manualItem.quantity} 
                    onChange={handleManualItemChange} 
                    min="1" 
                    placeholder="1" 
                    className={standardInputClasses} 
                  />
                </div>
                <div className="col-span-full"> {/* Description field spans full width */}
                  <label htmlFor="manual_description" className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción (Opcional)
                  </label>
                  <textarea
                    id="manual_description"
                    name="description"
                    value={manualItem.description}
                    onChange={handleManualItemChange}
                    placeholder="Detalles adicionales del item manual"
                    rows="3"
                    className={`${standardInputClasses} w-full`}
                  />
                </div>
                <button 
                  type="button" 
                  onClick={addManualItem} 
                  className="col-span-full mt-3 w-full bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-2 px-4 rounded-md shadow-sm transition-colors text-sm"
                >
                  Agregar Item Manual
                </button>
              </div>
            </fieldset>
          )}
        </div>
            </div>

              

              {/* --- Lista de Items Añadidos --- */}
              <div className="mt-6 border-t border-gray-200 pt-5 bg-white p-4 rounded-lg shadow">
                <h4 className="text-md font-semibold mb-3 text-gray-700">Items Añadidos:</h4>
                {formData.lineItems.length === 0 ? (
                  <p className="text-gray-500 text-sm py-3 text-center">Aún no se han añadido items.</p>
                ) : (
                  <ul className="space-y-3 max-h-72 overflow-y-auto pr-2 -mr-2"> {/* Negative margin to offset scrollbar */}
                    {formData.lineItems.map(item => (
                      <li key={item._tempId} className="flex justify-between items-start text-sm py-3 border-b border-gray-200 last:border-b-0 hover:bg-gray-50 transition-colors rounded-md px-2">
                        <div className="flex-grow mr-3">
                          <span className="font-medium text-gray-800">{item.name}</span>
                          {item.marca && <span className="text-gray-600 text-xs"> ({item.marca})</span>}
                          {item.capacity && <span className="text-gray-600 text-xs"> [{item.capacity}]</span>}
                          <span className="block text-gray-700 text-xs">Cant: {item.quantity} @ ${parseFloat(item.unitPrice).toFixed(2)} c/u</span>
                          {item.notes && <span className="block text-xs text-gray-500 italic mt-1 ml-2">- {item.notes}</span>}
                        </div>
                        <button type="button" onClick={() => handleRemoveItem(item._tempId)} className="text-gray-500 hover:text-red-500 text-xs font-medium ml-2 flex-shrink-0 transition-colors py-1">Eliminar</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            {/* --- Descuento --- */}
            <fieldset className="border border-gray-200 p-4 rounded-lg bg-white shadow">
              <legend className="text-md font-semibold px-2 text-gray-700">Descuento</legend>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center pt-2"> {/* Made discount section responsive */}
                <div className="sm:col-span-3">
                  <label htmlFor="discount_desc" className="block text-sm font-medium text-gray-700">Descripción</label>
                  <input id="discount_desc" type="text" name="discountDescription" value={formData.discountDescription} onChange={handleGeneralInputChange} className={standardInputClasses} />
                </div>
                <div className="sm:col-span-1">
                  <label htmlFor="discount_amount" className="block text-sm font-medium text-gray-700">Monto ($)</label>
                  <input id="discount_amount" type="number" name="discountAmount" value={formData.discountAmount} onChange={handleGeneralInputChange} min="0" step="0.01" className={standardInputClasses} />
                </div>
              </div>
            </fieldset>

            {/* --- Totales y Pago Inicial --- */}
            <div className="text-right space-y-2 border-t border-gray-200 pt-6 mt-6">
              <p className="text-gray-700">Subtotal: <span className="font-semibold text-gray-900">${formData.subtotalPrice.toFixed(2)}</span></p>
              {formData.discountAmount > 0 && (
                <p className="text-red-600">Descuento ({formData.discountDescription || 'General'}): <span className="font-semibold">-${formData.discountAmount.toFixed(2)}</span></p>
              )}
              <p className="text-lg font-bold text-gray-800">Total: <span className="font-semibold text-gray-900">${formData.totalPrice.toFixed(2)}</span></p>
              <div className="flex flex-col sm:flex-row justify-end items-center space-y-2 sm:space-y-0 sm:space-x-3 mt-3 pt-2"> {/* Made payment section responsive */}
                <label htmlFor="payment_perc" className="text-sm font-medium text-gray-700">Pago Inicial:</label>
                <select id="payment_perc" name="initialPaymentPercentage" value={formData.initialPaymentPercentage} onChange={handlePaymentPercentageChange} className={`${standardInputClasses} !mt-0 w-auto min-w-[120px]`}>
                  <option value="60">60%</option>
                  <option value="total">Total (100%)</option>
                </select>
                <span className="text-lg font-semibold text-gray-900">(${formData.initialPayment.toFixed(2)})</span>
              </div>
            </div>

            {/* --- Notas Generales --- */}
            <div className="pt-2">
              <label htmlFor="general_notes" className="block text-sm font-medium text-gray-700">Notas Generales</label>
              <textarea id="general_notes" name="generalNotes" value={formData.generalNotes} onChange={handleGeneralInputChange} rows="4" className={`${standardInputClasses} w-full`}></textarea>
            </div>

            {/* --- Botón Submit --- */}
      
       <div className="mt-8 border-t border-gray-200 pt-6">
              {!createdBudgetInfo ? (
                <button
                  type="submit"
                  className="w-full bg-indigo-600 text-white py-2.5 px-4 rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors font-medium"
                  disabled={isSubmitting || isLoading || formData.lineItems.length === 0 || !selectedPermit}
                >
                  {isSubmitting ? 'Creando Presupuesto...' : "Crear Presupuesto"}
                </button>
              ) : (
                <div className="text-center p-4 bg-green-50 border border-green-300 rounded-md">
                  <p className="text-lg font-semibold text-green-700">¡Presupuesto creado exitosamente!</p>
                  <p className="text-sm text-gray-600 mt-1">ID del Presupuesto: {createdBudgetInfo.idBudget}</p> {/* Assuming idBudget from your previous code */}
                  <p className="text-sm text-gray-600">Fecha de Creación: {new Date(createdBudgetInfo.createdAt).toLocaleDateString()}</p>
                  {/* You might want to add a button to view the budget or navigate away */}
                </div>
               
              )}
            </div>
          </form>
        </div>
      </div>

</div>
    </div>
  );
};

export default CreateBudget;