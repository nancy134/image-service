const fs = require('fs');
const AWS = require('aws-sdk');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const jwt = require('./jwt');
const models = require('./models');
const axios = require('axios');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

function createImage(authParams, body, t){
    return new Promise(function(resolve, reject){
        models.Image.create(
            body,
            { transaction: t }
        ).then(function(image){
            resolve(image);
        }).catch(function(err){
            reject(err);
        });
    });
}

exports.getImages = function(authParms, pageParams){
    return new Promise(function(resolve, reject){
        jwt.verifyToken(authParams).then(function(jwtResult){
            var cognitoId = jwtResult["cognito:username"];
            models.Image.findAndCountAll({
                where: {cognitoId: cognitoId},
                limit: pageParams.limit,
                offset: pageParams.offset,
                order: [['createdAt', 'DESC']]
            }).then(function(images){
                var ret = {
                   page: pageParams.page,
                   perPage: pageParams.limit,
                   images: images
                }
                resolve(ret); 
            }).catch(function(err){
                reject(err);
            });
        }).catch(function(err){
            reject(err);
        });
    });
}

exports.deleteImage = function(authParams, id){
    return new Promise(function(resolve, reject){
        jwt.verifyToken(authParams).then(function(jwtResult){
            var cognitoId = jwtResult["cognito:username"];
            models.Image.destroy({
                where: {
                    id: id,
                    cognitoId: cognitoId
                }
            }).then(function(result){
                // delete image from s3 bucket
                resolve(result);
            }).catch(function(err){
                reject(err);
            });
        }).catch(function(err){
            reject(err);
        });
    });
}

function removeTempFile(filePath){
    fs.unlink(filePath, (err) => {
        if (err) {
           console.log(err)
        }
    });
}

exports.listObjectsV2 = function(authParams){
    return new Promise(function(resolve, reject){
        jwt.verifyToken(authParams).then(function(jwtResult){
            var cognitoId = jwtResult["cognito:username"];
            var prefix = "library/" + cognitoId;
            var params = {
                Bucket: process.env.S3_BUCKET,
                MaxKeys: 20,
                Prefix: prefix
            };
            s3.listObjectsV2(params, function(s3Err, s3Data){
                if (s3Err){
                    reject(s3Err);
                } else {
                    resolve(s3Data);
                }
            });
        }).catch(function(err){
            reject(err);
        });
    });
}

uploadResized = function(originalImage, width, height, key){
    return new Promise(function(resolve, reject){
        var options = {
            fit: 'contain',
            background: {r: 255, g: 255, b: 255},
            position: sharp.position.bottom
        };
        sharp(originalImage).resize(width, height, options).toBuffer((err, resizedImage, info) => {
            if (err) reject(err);
            const params = {
                Bucket: process.env.S3_BUCKET,
                Key: key,
                Body: resizedImage 
            };
            s3.upload(params, function(s3Err, s3Data) {
                if (s3Err) {
                    reject(s3Err);
                } else {
                    resolve(s3Data);
                }
            });
        }); 
    });
}

uploadOriginal = function(originalImage, key){
    return new Promise(function(resolve, reject){
        const params = {
            Bucket: process.env.S3_BUCKET,
            Key: key,
            Body: originalImage
        };
        s3.upload(params, function(s3Err, s3Data){
            if (s3Err) reject(s3Err);
            resolve(s3Data);
        }); 
    });
}

exports.uploadToS3Bucket = function(authParams, uploadParams){
    return new Promise(function(resolve, reject){
        jwt.verifyToken(authParams).then(function(jwtResult){    
            var filePath = "./" + uploadParams.path;
            var cognitoId = jwtResult["cognito:username"];
            fs.readFile(filePath, (err, data) => {
                if (err){
                    reject(err);
                }
                var key1 = 
                    "library" + "/" +
                    cognitoId + "/" + 
                    uuidv4() + "/" +
                    uploadParams.originalName;
                uploadOriginal(data, key1).then(function(result){
                    removeTempFile(filePath);
                    var url = 
                        "https://" +
                        result.Bucket +
                        ".s3.amazonaws.com/" +
                        result.Key;
                    var body = {
                        cognitoId: cognitoId,
                        url: url,
                        order: uploadParams.order,
                        name: uploadParams.originalName
                    };
                    createImage(authParams, body).then(function(image){
                        resolve(image);
                    }).catch(function(err){
                        reject(err);
                    });
                }).catch(function(err){
                    removeTempFile(filePath);
                    reject(err);
                });
            });
        }).catch(function(err){
            reject(err);
        });
    });
} 


exports.resizeImage = function(body){
    return new Promise(function(resolve, reject){
        var options = {
            url: body.url,
            method: 'get',
            responseType: 'arraybuffer'
        };
        axios(options).then(function(arrayBuffer){
            var buffer = Buffer.from(arrayBuffer.data, 'binary');
            var key = 
                //body.listingId + "/";
                body.listingId + "/" +
                body.width + "/" +
                body.height + "/" +
                "image.jpg";
            uploadResized(buffer, body.width, body.height, key).then(function(result){
                resolve(result);
            }).catch(function(err){
                reject(err);
            });
        }).catch(function(err){
            reject(err);
        });
    });
}