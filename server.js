const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const imageService = require('./image');
const upload = multer({dest: 'uploads/'});
const jwt = require('./jwt');

const PORT = 8080;
const HOST = '0.0.0.0';

const app = express();
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());
app.use(cors());

app.get('/', (req, res) => {
    res.send("image-service");
});

app.get('/images', function(req, res){
    var authParams = jwt.getAuthParams(req);
    imageService.listObjectsV2(authParams).then(function(result){
        res.send(result);
    }).catch(function(err){
        console.log(err);
        res.status(400).send(err);
    });
});

app.post('/upload', upload.single('image'), function(req, res, next) {
    console.log("req.body:");
    console.log(req.body);
    var authParms = jwt.getAuthParams(req);
    var uploadParams = {
        path: req.file.path,
        originalName: req.body.originalname
    };
    imageService.uploadToS3Bucket(authParams, uploadParams).then(function(result){
        res.send(result);
    }).catch(function(err){
        console.log(err);
        res.send(err);
    });
});
app.listen(PORT, HOST);
