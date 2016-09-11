import * as express from 'express';
import * as core from "express-serve-static-core";
import * as busboyPipe from 'busboy-pipe';
import * as fileUploadStreamFactory from 'file-upload-stream-factory';
import * as s3UploadStreamFactory from 's3-upload-stream-factory';
import * as events from 'events';

let router = express.Router();

let eventEmitter = new events.EventEmitter();
eventEmitter.on('begin', (params: busboyPipe.EventParamsBase) => {
    console.log('begin ===========================================================');
}).on('end', (params: busboyPipe.EventParamsBase) => {
    console.log('end =============================================================');
}).on('total-files-count', (params: busboyPipe.FilesCountParams) => {
    console.log('number of files to pipe: ' + params.count);
}).on('file-begin', (params: busboyPipe.FilePipeParams) => {
    console.log('file-begin >>');
}).on('file-end', (params: busboyPipe.FilePipeParams) => {
    console.log(JSON.stringify(params.fileInfo))
    console.log('file-end <<');
    console.log('');
});

let filePathMaker = (params: busboyPipe.FilePipeParams) : string => {
    let s = 'c:/upload';
    let subFolder:string = params.req.body['subFolder'];
    if (subFolder) s += subFolder;
    s += '/' + params.fileInfo.filename;
    return s;
}

router.post('/file_upload', busboyPipe.get(fileUploadStreamFactory.get({filePathMaker}), {eventEmitter}), (req: express.Request, res: express.Response) => {
    let result:busboyPipe.Body = req.body;
    for (let field in result) {
        let value = result[field];
        console.log(field + ' ===> ' + JSON.stringify(value));
    }
    res.json(result);
});

let s3Options: s3UploadStreamFactory.Options = {
    "Bucket": 's3-fkh-tst'
    ,"KeyMaker": (params: busboyPipe.FilePipeParams): string => {
        let s = 'busboy_upload';
        let subFolder:string = params.req.body['subFolder'];
        if (subFolder) s += subFolder;
        s += '/' + params.fileInfo.filename;
        return s;
    }
    ,"additonalS3Options": {
        "ACL": "public-read"
        ,"ServerSideEncryption": "AES256"
    }
}

router.post('/s3_upload', busboyPipe.get(s3UploadStreamFactory.get(s3Options), {eventEmitter}), (req: express.Request, res: express.Response) => {
    let result:busboyPipe.Body = req.body;
    for (let field in result) {
        let value = result[field];
        console.log(field + ' ===> ' + JSON.stringify(value));
    }
    res.json(result);
});

export {router};