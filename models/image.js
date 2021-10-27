'use strict';

module.exports = (sequelize, DataTypes) => {
    const Image = sequelize.define('Image', {
        cognitoId: DataTypes.STRING,
        name: DataTypes.STRING,
        url: DataTypes.STRING,
        order: DataTypes.INTEGER,
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
    }); 
    return Image;
}
