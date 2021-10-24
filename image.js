const fs = require('fs');
const AWS = require('aws-sdk');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const jwt = require('./jwt');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

function removeUploadedFile(filePath){
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
                    removeUploadedFile(filePath);
                    resolve(result);
                }).catch(function(err){
                    removeUploadedFile(filePath);
                    reject(err);
                });
            });
        }).catch(function(err){
            reject(err);
        });
    });
} 
