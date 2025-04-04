require('dotenv').config();
const { Sequelize } = require('sequelize');

const fs = require('fs');
const path = require('path');
const {
  DB_USER,
  DB_PASSWORD,
  DB_HOST,
  DB_PORT,
  DB_NAME,
  DB_DEPLOY
  } = require('../config/envs');
//-------------------------------- CONFIGURACION PARA TRABAJAR LOCALMENTE-----------------------------------
const sequelize = new Sequelize(
  `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`,
  {
    logging: false, // set to console.log to see the raw SQL queries
    native: false, // lets Sequelize know we can use pg-native for ~30% more speed
  }
);
//-------------------------------------CONFIGURACION PARA EL DEPLOY---------------------------------------------------------------------
// const sequelize = new Sequelize(DB_DEPLOY , {
//       logging: false, // set to console.log to see the raw SQL queries
//       native: false, // lets Sequelize know we can use pg-native for ~30% more speed
//     }
//   );

const basename = path.basename(__filename);

const modelDefiners = [];

// Leemos todos los archivos de la carpeta Models, los requerimos y agregamos al arreglo modelDefiners
fs.readdirSync(path.join(__dirname, '/models'))
  .filter(
    (file) =>
      file.indexOf('.') !== 0 && file !== basename && file.slice(-3) === '.js'
  )
  .forEach((file) => {
    modelDefiners.push(require(path.join(__dirname, '/models', file)));
  });

// Injectamos la conexion (sequelize) a todos los modelos
modelDefiners.forEach((model) => model(sequelize));
// Capitalizamos los nombres de los modelos ie: product => Product
let entries = Object.entries(sequelize.models);
let capsEntries = entries.map((entry) => [
  entry[0][0].toUpperCase() + entry[0].slice(1),
  entry[1],
]);
sequelize.models = Object.fromEntries(capsEntries);

// En sequelize.models están todos los modelos importados como propiedades
// Para relacionarlos hacemos un destructuring
const { Staff, Permit, Budget, Work, Material, Inspection, Notification, InstallationDetail, MaterialSet, Images } = sequelize.models;

// Relaciones
Permit.hasMany(Work, { foreignKey: 'propertyAddress', sourceKey: 'propertyAddress' });
Work.belongsTo(Permit, { foreignKey: 'propertyAddress', targetKey: 'propertyAddress' });

Permit.hasMany(Budget, { foreignKey: 'propertyAddress', sourceKey: 'propertyAddress' });
Budget.belongsTo(Permit, { foreignKey: 'propertyAddress', targetKey: 'propertyAddress' });

Work.hasMany(Material, { foreignKey: 'workId' });
Material.belongsTo(Work, { foreignKey: 'workId' });

Staff.hasMany(Material, { foreignKey: 'staffId' });
Material.belongsTo(Staff, { foreignKey: 'staffId' });

Work.hasMany(Inspection, { foreignKey: 'workId' });
Inspection.belongsTo(Work, { foreignKey: 'workId' });

Staff.hasMany(Work, { foreignKey: 'staffId' });
Work.belongsTo(Staff, { foreignKey: 'staffId' });

Work.belongsTo(Budget, { foreignKey: 'idBudget', as: 'budget' });

// Relación entre Staff y Notification
Notification.belongsTo(Staff, { as: "sender", foreignKey: "senderId" });
Staff.hasMany(Notification, { as: "sentNotifications", foreignKey: "senderId" });

Notification.hasMany(Notification, { as: "responses", foreignKey: "parentId" });
Notification.belongsTo(Notification, { as: "parent", foreignKey: "parentId" });

Work.hasMany(InstallationDetail, { foreignKey: 'idWork', as: 'installationDetails' });
InstallationDetail.belongsTo(Work, { foreignKey: 'idWork', as: 'work' });

MaterialSet.hasMany(Material, { foreignKey: 'materialSetId' });
Material.belongsTo(MaterialSet, { foreignKey: 'materialSetId' });
// Relación entre Work y MaterialSet
Work.hasMany(MaterialSet, { foreignKey: 'workId', as: 'MaterialSets' });
MaterialSet.belongsTo(Work, { foreignKey: 'workId', as: 'Work' });
//---------------------------------------------------------------------------------//
module.exports = {
  ...sequelize.models, // para poder importar los modelos así: const { Product, User } = require('./db.js');
  conn: sequelize, // para importart la conexión { conn } = require('./db.js');
}; //  // para importart la conexión { conn } = require('./db.js');