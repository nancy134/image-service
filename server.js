const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const imageService = require('./image');
const upload = multer({dest: 'uploads/'});
const jwt = require('./jwt');
const utilities = require('./utilities');

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
    var pageParams = utilities.getPageParams(req);
    imageService.getImages(authParams, pageParams).then(function(result){
        res.send(result);
    }).catch(function(err){
        res.status(400).send(err);
    });
});

app.post('/upload', upload.single('image'), function(req, res, next) {
    var authParms = jwt.getAuthParams(req);
    var uploadParams = {
        path: req.file.path,
        originalName: req.body.originalname,
        order: req.body.order
    };
    imageService.uploadToS3Bucket(authParams, uploadParams).then(function(result){
        res.send(result);
    }).catch(function(err){
        res.send(err);
    });
});

app.delete('/images/:id', function(req, res){
    var authParams = jwt.getAuthParams(req);
    imageService.deleteImage(authParams, req.params.id).then(function(result){
        res.send("ok");
    }).catch(function(err){
        res.status(400).send(err);
    });
});

app.post('/images', function(req, res){
    imageService.resizeImage(req.body).then(function(result){
        res.send(result);
    }).catch(function(err){
        res.status(400).send(err);
    });
});


app.listen(PORT, HOST);
