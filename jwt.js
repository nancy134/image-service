var jwksClient = require('jwks-rsa');
var jwt = require('jsonwebtoken');

exports.getAuthParams = function(req){
    var authParms = {};
    var authorization = req.get("Authorization");
    var array = authorization.split(" ");
    var IdToken = array[1];

    var cognitoClientId = req.get("com-sabresw-cognito-client-id");
    var cognitoPoolId =  req.get("com-sabresw-cognito-pool-id");
    var jwksUri = 
        "https://cognito-idp." +
        process.env.AWS_REGION +
        ".amazonaws.com/" +
        cognitoPoolId +
        "/.well-known/jwks.json";
    var issuer = 
        "https://cognito-idp." +
        process.env.AWS_REGION +
        ".amazonaws.com/" +
        cognitoPoolId;

    authParams = {
        cognitoClientId: cognitoClientId,
        cognitoPoolId: cognitoPoolId,
        jwksUri: jwksUri,
        issuer: issuer,
        IdToken: IdToken
    };
    return authParams;
}

exports.isAdmin = function(jwtResult){
   if (jwtResult["cognito:groups"]){
       var groups = jwtResult["cognito:groups"];
       if (groups.includes("Admin")){
           return true;
       } else {
           return false;
       }
   } else {
       return false;
   }
}

exports.verifyToken = function(authParams){
    return new Promise(function(resolve, reject){
        var client = jwksClient({
            jwksUri: authParams.jwksUri
        });

        function getKey(header, callback){
            client.getSigningKey(header.kid, function(err, key){
                var signingKey;
                if (key){
                    signingKey = key.getPublicKey();
                } else {
                    signingKey = null;
                }
                callback(null, signingKey);
            });
        }

        jwt.verify(authParams.IdToken, getKey, {aud:authParams.cognitoClientId ,iss:authParams.issuer}, function(err, decoded){
            if (err){
                if (err.name === "TokenExpiredError"){
                    err.statusCode = 401;
                } else {
                    err.statusCode = 400;
                }
                reject(err);
            }
            resolve(decoded);
        });
    });
}

