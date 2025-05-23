const { Permit, Budget } = require('../data');

// NUEVO MÉTODO: Verificar Permit por Property Address
const checkPermitByPropertyAddress = async (req, res, next) => {
  try {
    const { propertyAddress } = req.query; // Espera propertyAddress como query param

    if (!propertyAddress) {
      return res.status(400).json({ error: true, message: "Property address es requerida para la verificación." });
    }

    const permit = await Permit.findOne({
      where: { propertyAddress },
      include: [{
        model: Budget,
        as: 'Budgets', // Asegúrate que el alias 'Budgets' esté definido en tu asociación Permit-Budget
        attributes: ['idBudget'], // Solo necesitamos saber si existe alguno
      }]
    });

    if (!permit) {
      return res.status(200).json({ exists: false, permit: null, hasBudget: false });
    }

    const hasBudget = permit.Budgets && permit.Budgets.length > 0;
    // Devolver el permit sin los datos de los Budgets para no inflar la respuesta, solo el ID del permit
    const permitData = permit.get({ plain: true });
    delete permitData.Budgets; // No necesitamos enviar la lista de Budgets

    res.status(200).json({
      exists: true,
      permit: permitData, // Devolver los datos del permit encontrado
      hasBudget: hasBudget,
      message: hasBudget ? "El permiso ya existe y tiene presupuestos asociados." : "El permiso ya existe pero no tiene presupuestos."
    });

  } catch (error) {
    console.error("Error al verificar el permiso por dirección:", error);
    next(error);
  }
};

// Crear un nuevo permiso
const createPermit = async (req, res, next) => {
  try {
    console.log("Request body:", req.body);
    console.log("Request files:", req.files);

    // Validaciones básicas
    if (!req.body.applicantName || !req.body.propertyAddress) {
      return res.status(400).json({ error: true, message: "Faltan campos obligatorios." });
    }

    const { 
      permitNumber,
      applicationNumber,
      applicantName,
      applicantEmail,
      applicantPhone,
      documentNumber,
      constructionPermitFor,
      applicant,
      propertyAddress,
      lot,
      block,
      propertyId,
      systemType,
      configuration,
      locationBenchmark,
      drainfieldDepth,
      expirationDate,
      dosingTankCapacity,
      gpdCapacity,
      excavationRequired,
      squareFeetSystem,
      other,
      pump,
    } = req.body;

    let expirationStatus = "valid"; // Estado por defecto
    let expirationMessage = "";

    if (expirationDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0); 
      
      const expDateParts = expirationDate.split('-');
      // Asegurarse de que los componentes de la fecha son números válidos
      const year = parseInt(expDateParts[0], 10);
      const month = parseInt(expDateParts[1], 10) -1; // Mes es 0-indexado en JS Date
      const day = parseInt(expDateParts[2], 10);

      if (isNaN(year) || isNaN(month) || isNaN(day) || month < 0 || month > 11 || day < 1 || day > 31) {
         // Si la fecha no es válida, podrías decidir qué hacer.
         // Por ahora, la dejaremos como 'valid' y el frontend/DB podría manejar el error de formato.
         // O podrías devolver un error aquí si el formato es estrictamente necesario.
         console.warn(`Fecha de expiración con formato inválido recibida: ${expirationDate}`);
         // Alternativamente, podrías forzar un error:
         // return res.status(400).json({
         //   error: true,
         //   message: `La fecha de expiración proporcionada ('${expirationDate}') no es válida.`
         // });
      } else {
        const expDate = new Date(year, month, day);
        expDate.setHours(0,0,0,0);

        if (isNaN(expDate.getTime())) {
          // Esto podría ocurrir si, por ejemplo, se pasa '2023-02-30'
          console.warn(`Fecha de expiración inválida (post-parse): ${expirationDate}`);
          // Considera devolver un error si la fecha es completamente inválida
        } else {
          if (expDate < today) {
            expirationStatus = "expired";
            expirationMessage = `El permiso expiró el ${expDate.toLocaleDateString()}.`;
            console.warn(`Advertencia Backend: ${expirationMessage}`);
          } else {
            const thirtyDaysFromNow = new Date(today);
            thirtyDaysFromNow.setDate(today.getDate() + 30);
            if (expDate <= thirtyDaysFromNow) {
              expirationStatus = "soon_to_expire";
              expirationMessage = `El permiso expira el ${expDate.toLocaleDateString()} (pronto a vencer).`;
              console.warn(`Advertencia Backend: ${expirationMessage}`);
            }
          }
        }
      }
    }

    // Manejar los archivos enviados
    const pdfData = req.files?.pdfData ? req.files.pdfData[0].buffer : null; // Archivo principal
    const optionalDocs = req.files?.optionalDocs ? req.files.optionalDocs[0].buffer : null; // Documentación opcional

    // Crear el permiso en la base de datos
    const permitDataToCreate = {
      permitNumber,
      applicationNumber,
      applicantName,
      applicantEmail,
      applicantPhone,
      documentNumber,
      constructionPermitFor,
      applicant,
      propertyAddress,
      lot,
      block,
      propertyId,
      systemType,
      configuration,
      locationBenchmark,
      drainfieldDepth,
      expirationDate: expirationDate || null,
      dosingTankCapacity,
      gpdCapacity,
      excavationRequired,
      squareFeetSystem,
      other,
      pump,
      pdfData,
      optionalDocs,
    };

    const permit = await Permit.create(permitDataToCreate);

    console.log("Permiso creado correctamente:", permit.idPermit);
    
    // Añadir el estado de expiración a la respuesta
    const permitResponse = permit.get({ plain: true });
    permitResponse.expirationStatus = expirationStatus;
    if (expirationMessage) {
      permitResponse.expirationMessage = expirationMessage;
    }

    res.status(201).json(permitResponse);
  } catch (error) {
    console.error("Error al crear el permiso (en controller):", error.message, error.stack);
    if (error.name === 'SequelizeDatabaseError' && error.original?.code === '22007') { 
        return res.status(400).json({ error: true, message: "El formato de la fecha de expiración es incorrecto para la base de datos."});
    }
    next(error);
  }
};

// Obtener todos los permisos
const getPermits = async (req, res) => {
  try {
    const permits = await Permit.findAll({
    attributes: { exclude: ['pdfData'] },
    })
    res.status(200).json(permits);
  } catch (error) {
    console.error('Error al obtener permisos:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor' });
  }
};

// Obtener un permiso por ID
const getPermitById = async (req, res, next) => { // Asegúrate de tener next si usas un manejador de errores global
  try {
    const { idPermit } = req.params;
    const permitInstance = await Permit.findByPk(idPermit);

    if (!permitInstance) {
      return res.status(404).json({ error: true, message: 'Permiso no encontrado' });
    }

    const permit = permitInstance.get({ plain: true }); // Obtener objeto plano para modificarlo

    let expirationStatus = "valid";
    let expirationMessage = "";

    if (permit.expirationDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0); 

      // permit.expirationDate de Sequelize es un string 'YYYY-MM-DD' o un objeto Date
      // Normalizar a string 'YYYY-MM-DD' para parseo consistente
      const expirationDateString = typeof permit.expirationDate === 'string' 
                                  ? permit.expirationDate.split('T')[0] 
                                  : new Date(permit.expirationDate).toISOString().split('T')[0];
      
      const expDateParts = expirationDateString.split('-');
      const year = parseInt(expDateParts[0], 10);
      const month = parseInt(expDateParts[1], 10) - 1; // Mes es 0-indexado en JS Date
      const day = parseInt(expDateParts[2], 10);

      if (!isNaN(year) && !isNaN(month) && !isNaN(day) && month >= 0 && month <= 11 && day >= 1 && day <= 31) {
        const expDate = new Date(year, month, day);
        expDate.setHours(0,0,0,0);

        if (!isNaN(expDate.getTime())) {
          if (expDate < today) {
            expirationStatus = "expired";
            expirationMessage = `El permiso asociado expiró el ${expDate.toLocaleDateString()}. No se debería crear un presupuesto.`;
          } else {
            const thirtyDaysFromNow = new Date(today);
            thirtyDaysFromNow.setDate(today.getDate() + 30);
            if (expDate <= thirtyDaysFromNow) {
              expirationStatus = "soon_to_expire";
              expirationMessage = `El permiso asociado expira el ${expDate.toLocaleDateString()} (pronto a vencer).`;
            }
          }
        } else {
          console.warn(`Fecha de expiración inválida (post-parse) para permit ${idPermit}: ${expirationDateString}`);
        }
      } else {
        console.warn(`Formato de fecha de expiración inválido para permit ${idPermit}: ${expirationDateString}`);
      }
    }

    // Añadir el estado de expiración al objeto permit que se devuelve
    permit.expirationStatus = expirationStatus;
    permit.expirationMessage = expirationMessage;

    res.status(200).json(permit);
  } catch (error) {
    console.error('Error al obtener el permiso:', error);
    // Si tienes un manejador de errores global, usa next(error)
    // De lo contrario, envía una respuesta de error
    if (next) {
      next(error);
    } else {
      res.status(500).json({ error: true, message: 'Error interno del servidor' });
    }
  }
};

// Actualizar un permiso
const updatePermit = async (req, res) => {
  try {
    const { idPermit } = req.params;
    const updates = req.body;
    const pdfData = req.file ? req.file.buffer : null;

    const permit = await Permit.findByPk(idPermit);

    if (!permit) {
      return res.status(404).json({ error: true, message: 'Permiso no encontrado' });
    }

    Object.assign(permit, updates);
    if (pdfData) permit.pdfData = pdfData;

    await permit.save();
    res.status(200).json(permit);
  } catch (error) {
    console.error('Error al actualizar el permiso:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor' });
  }
};

// Descargar el PDF asociado a un permiso
const downloadPermitPdf = async (req, res) => {
  try {
    const { idPermit } = req.params;
    const permit = await Permit.findByPk(idPermit);

    if (!permit || !permit.pdfData) {
      return res.status(404).json({ error: true, message: 'PDF no encontrado' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=permit-${id}.pdf`);
    res.send(permit.pdfData);
  } catch (error) {
    console.error('Error al descargar el PDF:', error);
    res.status(500).json({ error: true, message: 'Error interno del servidor' });
  }
};

const getContactList = async (req, res) => {
  try {
    const { idPermit } = req.params; // Obtener el ID del permiso desde los parámetros de la URL (si existe)

    // Configurar la condición de búsqueda
    const whereCondition = idPermit ? { idPermit } : {}; // Si idPermit está presente, filtrar por él; de lo contrario, no filtrar

    // Buscar los contactos asociados al permiso (o todos si no se pasa idPermit)
    const contacts = await Permit.findAll({
      where: whereCondition, // Aplicar la condición de búsqueda
      attributes: ['applicantName', 'applicantEmail', 'applicantPhone', 'propertyAddress'],
    });

    if (!contacts || contacts.length === 0) {
      return res.status(404).json({
        error: true,
        message: idPermit
          ? 'No se encontraron contactos para el permiso especificado'
          : 'No se encontraron contactos',
      });
    }

    // Filtrar o transformar los datos
    const filteredContacts = contacts.map((contact) => ({
      applicantName: contact.applicantName || 'No especificado',
      applicantEmail: contact.applicantEmail || 'No especificado',
      applicantPhone: contact.applicantPhone || 'No especificado',
      propertyAddress: contact.propertyAddress || 'No especificado',
    }));

    res.status(200).json({
      error: false,
      message: idPermit
        ? 'Listado de contactos para el permiso obtenido exitosamente'
        : 'Listado de todos los contactos obtenido exitosamente',
      data: filteredContacts,
    });
  } catch (error) {
    console.error('Error al obtener el listado de contactos:', error);
    res.status(500).json({
      error: true,
      message: 'Error interno del servidor',
    });
  }
};

// *** NUEVO MÉTODO: Servir el PDF principal (pdfData) para visualización inline ***
const getPermitPdfInline = async (req, res) => {
  try {
    const { idPermit } = req.params;
    const permit = await Permit.findByPk(idPermit, {
      attributes: ['pdfData'] // Solo necesitamos el BLOB principal
    });

    if (!permit || !permit.pdfData) {
      return res.status(404).send('PDF principal no encontrado'); // Enviar texto simple para errores
    }

    res.setHeader('Content-Type', 'application/pdf');
    // Sugiere mostrar inline en lugar de descargar
    res.setHeader('Content-Disposition', `inline; filename="permit_${idPermit}.pdf"`);
    res.send(permit.pdfData); // Enviar los datos binarios

  } catch (error) {
    console.error(`Error al obtener PDF principal del permit ${req.params.idPermit}:`, error);
    res.status(500).send('Error al obtener el PDF principal'); // Enviar texto simple
  }
};

// *** NUEVO MÉTODO: Servir el PDF opcional (optionalDocs) para visualización inline ***
const getPermitOptionalDocInline = async (req, res) => {
  try {
    const { idPermit } = req.params;
    const permit = await Permit.findByPk(idPermit, {
      attributes: ['optionalDocs'] // Solo necesitamos el BLOB opcional
    });

    if (!permit || !permit.optionalDocs) {
      return res.status(404).send('Documento opcional no encontrado'); // Enviar texto simple
    }

    res.setHeader('Content-Type', 'application/pdf');
    // Sugiere mostrar inline
    res.setHeader('Content-Disposition', `inline; filename="optional_${idPermit}.pdf"`);
    res.send(permit.optionalDocs); // Enviar los datos binarios

  } catch (error) {
    console.error(`Error al obtener Doc Opcional del permit ${req.params.idPermit}:`, error);
    res.status(500).send('Error al obtener el documento opcional'); // Enviar texto simple
  }
};



module.exports = {
  createPermit,
  getPermits,
  getPermitById,
  updatePermit,
  downloadPermitPdf,
  getPermitPdfInline, 
  getPermitOptionalDocInline,
  getContactList,
  checkPermitByPropertyAddress, // NUEVO MÉTODO
};