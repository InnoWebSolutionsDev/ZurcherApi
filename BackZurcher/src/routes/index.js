const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const adminRoutes = require('./adminRoutes');
const budgetRoutes = require('./BudgetRoutes');
const pdfRoutes = require('./pdfRoutes');
const inspectionRoutes = require('./inspectionRoutes');
const materialRoutes = require('./materialRoutes');
const workRoutes = require('./workRoutes');
const permitRoutes = require('./permitRoutes');
const notificationRoutes = require('./NotificationRoutes'); // Asegúrate de que la ruta sea correcta


// Rutas públicas
router.use('/auth', authRoutes); // Registro y login no requieren token

// Rutas protegidas (requieren token)
const { verifyToken } = require('../middleware/isAuth');
router.use(verifyToken); // Middleware global para rutas protegidas
router.use('/admin', adminRoutes);
router.use('/budget', budgetRoutes);
router.use('/pdf', pdfRoutes);
router.use('/inspection', inspectionRoutes);
router.use('/material', materialRoutes);
router.use('/work', workRoutes);
router.use('/permit', permitRoutes);
router.use('/notification', notificationRoutes); // Rutas de notificaciones


module.exports = router;