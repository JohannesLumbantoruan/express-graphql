require('dotenv').config();

const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { graphqlHTTP } = require('express-graphql');
const jwt = require('jsonwebtoken');

const schema = require('./graphql/schema');
const rootValue = require('./graphql/resolvers');

const authenticate = require('./middlewares/authenticate');
const deleteFile = require('./helper/deleteFile');

const isAuthenticate = require('./middlewares/isAuthenticate');
const graphiqlAuthenticate = require('./middlewares/graphqlAuthenticate');

const app = express();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'images');
    },
    filename: (req, file, cb) => {
        cb(null, uuidv4() + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    if (
        file.mimetype === 'image/png' ||
        file.mimetype === 'image/jpg' ||
        file.mimetype === 'image/jpeg'
    ) {
        cb(null, true);
    } else {
        cb(null, false);
    }
};

app.use(bodyParser.json());
app.use(cors());
// app.use((req, res, next) => {
//     res.setHeader('Access-Control-Allow-Origin', '*');
//     res.setHeader('Access-Control-Allow-Method', 'OPTIONS, GET, POST, PUT, PATCH, DELETE');
//     res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

//     if (req.method === 'OPTIONS') return res.sendStatus(200);

//     next();
// });
app.use((req, res, next) => {
    const { method, path } = req;
    console.log(`${method} ${path}`);
    next();
});
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use(multer({
    storage,
    fileFilter,
    limits: {
        fileSize: '5MB'
    }
}).single('image'));
app.use(isAuthenticate);

app.put('/images', (req, res, next) => {
    graphiqlAuthenticate(req.isAuthenticated);

    if (!req.file) return res.status(200).json({ message: 'No image provided' });
    if (req.body.oldPath) deleteFile(req.body.oldPath);

    const filePath = 'http://localhost:8080/' + req.file.path.replace('\\', '/');

    return res.status(201).json({ message: 'Image stored', filePath });
});

app.use('/graphql', graphqlHTTP({
    schema,
    rootValue,
    graphiql: true,
    formatError(err) {
        if (!err.originalError) return err;
        const message = err.message || 'An error occured'; 
        const data = err.originalError.data;
        const code = err.originalError.code || 500;
        return { message, status: code, data };
    }
}));

app.use((err, req, res, next) => {
    console.log(err);
    let { statusCode, message } = err;
    if (!statusCode) statusCode = 500;
    if (!message) message = 'Internal Server Error';

    res
        .status(statusCode)
        .json({ message });
});

mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
        console.log('MongoDB connected');
        app.listen(8080);
    })
    .catch(err => {
        console.log(err);
    });