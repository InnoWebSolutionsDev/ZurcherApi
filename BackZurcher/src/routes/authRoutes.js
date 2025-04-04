const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/isAuth');
const { validateRegister, validateLogin } = require('../middleware/validation/validateUser');
const {
    login,
    register,
    logout,
    changePassword,
    forgotPassword,
    resetPassword,
    
} = require('../controllers/User/authController');


// Rutas públicas
router.post('/register', validateRegister, register); // Registro no requiere token
router.post('/login', validateLogin, login); // Login no requiere token
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);
// Rutas protegidas
router.use(verifyToken); // Middleware para proteger las rutas siguientes
router.post('/logout', logout);
router.put('/change-password', changePassword);


module.exports = router;
