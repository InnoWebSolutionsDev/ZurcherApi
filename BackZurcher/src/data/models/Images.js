const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Image', {
    idWork: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    stage: {
      type: DataTypes.ENUM(
        'foto previa del lugar',
        'foto excavación',
        'foto tanque instalado',
        'fotos de cada camión de arena',
        'foto inspección final',
        'foto de extracción de piedras'
      ),
      allowNull: false,
    },
    imageData: {
      type: DataTypes.TEXT('long'), // o DataTypes.BLOB si prefieres
      allowNull: false, // o true, dependiendo de si siempre quieres una imagen
    },
  });
};