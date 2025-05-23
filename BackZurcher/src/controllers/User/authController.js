const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Staff } = require('../../data');
const { generateToken } = require('../../middleware/isAuth');
const { CustomError } = require('../../middleware/error');
const { transporter } = require('../../utils/transporter');
const { emailTemplates } = require('../../utils/emailTemplates');
const crypto = require('crypto');
const { sendEmail } = require('../../utils/notifications/emailService');
const { Op } = require('sequelize');

const register = async (req, res, next) => {
  try {
    const { email, password, role, phone = 'Admin', ...staffData } = req.body;

    if (!email || !password || !role) { // Validar campos requeridos
      throw new CustomError('Email, contraseña y rol son requeridos', 400);
  }

  const lowercasedEmail = email.toLowerCase();
    // Verificar si el correo ya existe
    const existingStaff = await Staff.findOne({
      where: {
        email: lowercasedEmail,
        deletedAt: null,
      },
    });

    if (existingStaff) {
      throw new CustomError('El correo ya está registrado', 400);
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear usuario
    const newStaff = await Staff.create({
      ...staffData,
      email: lowercasedEmail,
      password: hashedPassword,
      role,
      phone,
      isActive: true,
      lastLogin: new Date(),
    });

    // Generar token JWT
    const token = generateToken(newStaff);

    // Usar el método toJSON definido en el modelo
    const staffResponse = newStaff.toJSON();

    res.status(201).json({
      error: false,
      message: 'Usuario registrado exitosamente',
      data: { token, user: staffResponse },
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt with email:', email); // Log email recibido

    if (!email || !password) {
      console.log('Validation failed: Email or password missing.');
      // Es una buena práctica validar que ambos campos estén presentes
      throw new CustomError('Email y contraseña son requeridos', 400);
    }

    const lowercasedEmail = email.toLowerCase();
    console.log('Searching for staff with email (lowercased):', lowercasedEmail);

    const staff = await Staff.findOne({
      where: {
        email: lowercasedEmail,
        isActive: true,
        deletedAt: null,
      },
    });

    if (!staff) {
      console.log('Staff not found or not active for email:', lowercasedEmail);
      throw new CustomError('Credenciales inválidas (usuario no encontrado o inactivo)', 400); // Mensaje más específico
    }
    console.log('Staff found:', staff.toJSON ? staff.toJSON() : staff); // Log del staff encontrado

    // Verificar la contraseña
    console.log('Comparing provided password with stored hash for staff ID:', staff.id);
    const validPassword = await bcrypt.compare(password, staff.password);
    console.log('Password validation result (validPassword):', validPassword);

    if (!validPassword) {
      console.log('Password comparison failed for staff ID:', staff.id);
      throw new CustomError('Credenciales inválidas (contraseña incorrecta)', 400); // Mensaje más específico
    }

    // Actualizar último login
    await staff.update({ lastLogin: new Date() });
    console.log('Last login updated for staff ID:', staff.id);

    // Generar token JWT
    const token = generateToken(staff);
    console.log('JWT generated for staff ID:', staff.id);

    // Usar el método toJSON definido en el modelo
    const staffResponse = staff.toJSON();

    res.json({
      error: false,
      message: 'Login exitoso',
      data: {
        token,
        staff: {
          ...staffResponse,
         
          name: staff.name, // Incluye el nombre del usuario
          email: staff.email, // Incluye el email
          role: staff.role, // Incluye el rol
          lastLogin: staff.lastLogin, // Incluye el último login
        },
      },
    });
  } catch (error) {
    console.error('Error during login process:', error); // Log del error completo
    if (error instanceof CustomError) {
      console.error('CustomError details:', { message: error.message, statusCode: error.statusCode });
    }
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    const { email } = req.user; // Cambiado de req.staff a req.user
    await Staff.update(
      { lastLogout: new Date() },
      { where: { email } }
    );

    res.json({
      error: false,
      message: 'Sesión cerrada exitosamente',
    });
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const { email } = req.user;

    const staff = await Staff.findOne({ where: { email } });

    // Verificar contraseña actual
    const validPassword = await bcrypt.compare(currentPassword, staff.password);
    if (!validPassword) {
      throw new CustomError('Contraseña actual incorrecta', 400);
    }

    // Hash y actualizar nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await staff.update({ password: hashedPassword });

    res.json({
      error: false,
      message: 'Contraseña actualizada exitosamente',
    });
  } catch (error) {
    next(error);
  }
};
// Controlador forgotPassword
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    // Buscar usuario activo
    const user = await Staff.findOne({
      where: {
        email,
        isActive: true,
        deletedAt: null,
      },
    });

    if (!user) {
      throw new CustomError('Usuario no encontrado', 404);
    }

    // Generar token seguro
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(resetToken, 10);

    // Actualizar usuario con token
    await user.update({
      passwordResetToken: hashedToken,
      passwordResetExpires: Date.now() + 3600000, // 1 hora
    });

    // Crear URL de restablecimiento
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    // Enviar correo de recuperación
    const message = `
      Hemos recibido una solicitud para restablecer tu contraseña. 
      Si no realizaste esta solicitud, puedes ignorar este correo.
      <br><br>
      Haz clic en el siguiente enlace para restablecer tu contraseña:
      <br>
      <a href="${resetUrl}" style="color: #0056b3;">${resetUrl}</a>
    `;

    await sendEmail(user, message);

    res.status(200).json({ message: 'Correo enviado para restablecer tu contraseña' });
  } catch (error) {
    next(error);
  }
};

// Controlador resetPassword
const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const user = await Staff.findOne({
      where: {
        passwordResetToken: { [Op.ne]: null },
        passwordResetExpires: { [Op.gt]: Date.now() },
      },
    });

    if (!user) throw new CustomError('El enlace ha expirado o no es válido', 400);

    const isTokenValid = await bcrypt.compare(token, user.passwordResetToken);
    if (!isTokenValid) throw new CustomError('Token inválido', 400);

    const hashedPassword = await bcrypt.hash(password, 10);
    await user.update({
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpires: null,
    });

    res.json({ error: false, message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    next(error);
  }
};




module.exports = {
  register,
  login,
  logout,
  changePassword,
  forgotPassword,
  resetPassword,
  
};