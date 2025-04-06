const { app, server } = require("./src/app.js"); // Importar tanto app como server
const { conn } = require("./src/data");
const { PORT } = require("./src/config/envs.js");
require("dotenv").config();

// Sincronizar todos los modelos
conn.sync({ force: true }).then(async () => {
  server.listen(PORT, () => { // Usar server.listen en lugar de app.listen
    console.log(`🚀 Servidor escuchando en el puerto: ${PORT} 🚀`);
  });
});

