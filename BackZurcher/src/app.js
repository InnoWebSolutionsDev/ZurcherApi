const express = require('express');
const session = require('express-session');
const morgan = require('morgan');
const routes = require('./routes');
const cors = require('cors');
const path = require('path');
const { passport } = require('./passport');
const { JWT_SECRET_KEY } = require('./config/envs');
const authRoutes = require('./routes/authRoutes');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
require('./tasks/cronJobs');

const app = express();
const server = http.createServer(app); // Crear el servidor HTTP

app.get('/health', (req, res) => {
  try {
    const dbStatus = conn.authenticate()
      .then(() => 'connected')
      .catch(() => 'disconnected');

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: dbStatus,
      socket_connections: io?.engine?.clientsCount || 0,
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

const io = new Server(server, {
  cors: {
    origin: ["https://zurcher-api-9526.vercel.app", "http://localhost:3000"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  },
  path: '/socket.io/',
  transports: ['websocket', 'polling'],
  allowEIO3: true,
});

io.engine.on("connection_error", (err) => {
  console.log("Socket.IO connection error:", err.req);      // Log the full error
  console.log("Socket.IO error code:", err.code);          // Log the error code
  console.log("Socket.IO error message:", err.message);    // Log the error message
});

// Crear la carpeta "uploads" si no existe
const uploadsPath = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}
// Middleware para compartir `io` en toda la aplicación
app.set('io', io);

// Configuración de eventos de Socket.IO
const connectedUsers = {}; // Objeto para almacenar los usuarios conectados

io.on("connection", (socket) => {
  console.log("Usuario conectado:", socket.id);

  // Escuchar el evento "join" para asociar el staffId con el socket.id
  socket.on("join", (staffId) => {
    connectedUsers[staffId] = socket.id; // Asociar el staffId con el socket.id
    console.log(`Usuario con staffId ${staffId} conectado con socket.id ${socket.id}`);
  });

  // Eliminar al usuario del objeto cuando se desconecta
  socket.on("disconnect", () => {
    const staffId = Object.keys(connectedUsers).find(
      (key) => connectedUsers[key] === socket.id
    );
    if (staffId) {
      delete connectedUsers[staffId];
      console.log(`Usuario con staffId ${staffId} desconectado`);
    }
  });
});

// Middlewares
app.use(express.json({ limit: "10mb" })); // Cambia "10mb" según tus necesidades
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(morgan('dev'));
app.use(passport.initialize());


// Session
app.use(cors({
  origin: ["https://zurcher-api-9526.vercel.app", "http://localhost:3000"],
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// CORS Headers
// app.use((req, res, next) => {
//   res.header('Access-Control-Allow-Origin', '*'); 
//   res.header('Access-Control-Allow-Credentials', 'true');
//   res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
//   res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
//   next();
// });

// Routes
app.use('/', routes);
app.use('/auth', authRoutes);

// Not Found Middleware
app.use('*', (req, res) => {
  res.status(404).send({
    error: true,
    message: 'Not found',
  });
});
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  res.status(err.statusCode || 500).send({
    error: true,
    message: err.message,
  });
});

// Configuración de Socket.IO
// io.on('connection', (socket) => {
//   console.log('Usuario conectado:', socket.id);

//   // Escuchar eventos personalizados
//   socket.on('join', (staffId) => {
//     console.log(`Usuario con ID ${staffId} se unió a la sala`);
//     socket.join(staffId); // Unir al usuario a una sala específica basada en su ID
//   });

//   socket.on('disconnect', () => {
//     console.log('Usuario desconectado:', socket.id);
//   });
// });

module.exports =  { app, server, io };