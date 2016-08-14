import * as express from 'express';
import * as core from "express-serve-static-core";

let router = express.Router();

router.get('/test_get', (req:express.Request, res:express.Response) => {
    res.json(req.query);
    //res.status(400).json({});
});

router.post('/test_post', (req:express.Request, res:express.Response) => {
    res.json(req.body);
});

export {router};