const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Material', {
    idMaterial: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    cost: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    comment: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    materialSetId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
  });
};
