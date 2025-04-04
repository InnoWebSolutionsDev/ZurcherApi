import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchBudgets, updateBudget } from "../../Redux/Actions/budgetActions";
import { createWork } from "../../Redux/Actions/workActions";
import BudgetPDF from "./BudgetPDF";

const BudgetList = () => {
  const dispatch = useDispatch();

  // Obtener el estado de budgets desde Redux
  const { budgets, loading, error } = useSelector((state) => state.budget);

  // Estados para el paginado
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Llamar a la acción para obtener los budgets al montar el componente
  useEffect(() => {
    dispatch(fetchBudgets());
  }, [dispatch]);

  // Ordenar los presupuestos por estado (priorizando "created")
  const sortedBudgets = budgets
    .slice() // Crear una copia para no mutar el estado original
    .sort((a, b) => {
      if (a.status === "created" && b.status !== "created") return -1;
      if (a.status !== "created" && b.status === "created") return 1;
      return 0;
    });

  // Calcular los presupuestos para la página actual
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentBudgets = sortedBudgets.slice(indexOfFirstItem, indexOfLastItem);

  // Cambiar de página
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  // Función para manejar el cambio de estado del presupuesto
  const handleUpdateStatus = (idBudget, newStatus, budget) => {
    dispatch(updateBudget(idBudget, { status: newStatus })).then(() => {
      if (newStatus === "approved") {
        const workData = {
          propertyAddress: budget.propertyAddress,
          idBudget: budget.idBudget,
          status: "pending",
        };

        dispatch(createWork(workData))
          .then(() => {
            console.log("Work creado exitosamente");
          })
          .catch((error) => {
            console.error("Error al crear el Work:", error);
          });
      }
    });
  };

  // Función para obtener el color de fondo según el estado
  const getStatusColor = (status) => {
    switch (status) {
      case "created":
        return "bg-white"; // Blanco
      case "send":
        return "bg-yellow-200"; // Amarillo
      case "approved":
        return "bg-green-200"; // Verde
      case "notResponded":
        return "bg-orange-200"; // Naranja
      case "rejected":
        return "bg-red-200"; // Rojo
      default:
        return "bg-white"; // Blanco por defecto
    }
  };

  // Calcular el número total de páginas
  const totalPages = Math.ceil(sortedBudgets.length / itemsPerPage);

  return (
    <div className="p-4">
      <h1 className="text-sm font-semibold mb-4">Presupuestos</h1>

      {/* Mostrar estado de carga */}
      {loading && <p className="text-blue-500">Cargando presupuestos...</p>}

      {/* Mostrar error si ocurre */}
      {error && <p className="text-red-500">Error: {error}</p>}

      {/* Mostrar lista de presupuestos */}
      {!loading && !error && (
        <>
          {/* Tabla para pantallas grandes y medianas */}
          <div className="hidden lg:block">
            <table className="table-auto w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-gray-300 font-Montserrat px-4 text-xs">Aplicant</th>
                  <th className="border border-gray-300 font-Montserrat px-4 text-xs">Date</th>
                  <th className="border border-gray-300 px-4 font-Montserrat text-xs">End Date</th>
                  <th className="border border-gray-300 px-4 font-Montserrat text-xs">Precio</th>
                  <th className="border border-gray-300 px-4 font-Montserrat text-xs">Pago 60%</th>
                  <th className="border border-gray-300 px-4 font-Montserrat text-xs">Estate</th>
                  <th className="border border-gray-300 px-4 font-Montserrat text-xs">Adress</th>
                  <th className="border border-gray-300 px-4 font-Montserrat text-xs">systemType</th>
                  <th className="border border-gray-300 px-4 font-Montserrat text-xs">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {currentBudgets.map((budget) => (
                  <tr
                    key={budget.idBudget}
                    className={`hover:bg-gray-100 ${getStatusColor(budget.status)}`}
                  >
                    <td className="border border-gray-300 px-4 text-xs">{budget.applicantName}</td>
                    <td className="border border-gray-300 px-4 text-xs">{budget.date}</td>
                    <td className="border border-gray-300 px-4 text-xs">
                      {budget.expirationDate || "N/A"}
                    </td>
                    <td className="border border-gray-300 px-4 text-xs">${budget.price}</td>
                    <td className="border border-gray-300 px-4 text-xs">${budget.initialPayment}</td>
                    <td className="border border-gray-300 px-4 text-xs">{budget.status}</td>
                    <td className="border border-gray-300 px-4 text-xs">
                      {budget.propertyAddress || "No especificada"}
                    </td>
                    <td className="border border-gray-300 px-4 text-xs">
                      {budget.systemType || "No especificada"}
                    </td>
                    <td className="border border-gray-300 px-4">
                      <BudgetPDF
                        budget={{
                          ...budget,
                          price: parseFloat(budget.price),
                          initialPayment: parseFloat(budget.initialPayment),
                        }}
                        editMode={false}
                      />
                      <select
                        value={budget.status}
                        onChange={(e) =>
                          handleUpdateStatus(budget.idBudget, e.target.value, budget)
                        }
                        className="bg-gray-100 border border-gray-300 text-xs rounded px-1"
                      >
                        <option value="send" disabled={budget.status === "send"}>
                          {budget.status === "send" ? "Enviado" : "Enviar"}
                        </option>
                        <option value="approved">Aprobado</option>
                        <option value="rejected">Rechazado</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tarjetas para pantallas pequeñas */}
          <div className="block lg:hidden space-y-4">
            {currentBudgets.map((budget) => (
              <div
                key={budget.idBudget}
                className={`border border-gray-300 rounded-lg p-4 shadow-md ${getStatusColor(
                  budget.status
                )}`}
              >
                <p className="text-xs font-semibold">Aplicant: {budget.applicantName}</p>
                <p className="text-xs">Date: {budget.date}</p>
                <p className="text-xs">End Date: {budget.expirationDate || "N/A"}</p>
                <p className="text-xs">Precio: ${budget.price}</p>
                <p className="text-xs">Pago 60%: ${budget.initialPayment}</p>
                <p className="text-xs">Estate: {budget.status}</p>
                <p className="text-xs">Adress: {budget.propertyAddress || "No especificada"}</p>
                <p className="text-xs">System Type: {budget.systemType || "No especificada"}</p>
                <div className="mt-2">
                  <BudgetPDF
                    budget={{
                      ...budget,
                      price: parseFloat(budget.price),
                      initialPayment: parseFloat(budget.initialPayment),
                    }}
                    editMode={false}
                  />
                  <select
                    value={budget.status}
                    onChange={(e) =>
                      handleUpdateStatus(budget.idBudget, e.target.value, budget)
                    }
                    className="bg-gray-100 border border-gray-300 text-xs rounded px-1 mt-2"
                  >
                    <option value="send" disabled={budget.status === "send"}>
                      {budget.status === "send" ? "Enviado" : "Enviar"}
                    </option>
                    <option value="approved">Aprobado</option>
                    <option value="rejected">Rechazado</option>
                  </select>
                </div>
              </div>
            ))}
          </div>

          {/* Paginado */}
          <div className="flex justify-center mt-4">
            {Array.from({ length: totalPages }, (_, index) => (
              <button
                key={index + 1}
                onClick={() => handlePageChange(index + 1)}
                className={`mx-1 px-2 py-1 text-xs rounded ${
                  currentPage === index + 1
                    ? "bg-blue-950 text-white"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default BudgetList;