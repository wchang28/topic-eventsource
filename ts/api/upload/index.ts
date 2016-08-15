import * as express from 'express';
import * as core from "express-serve-static-core";
import * as busboyPipe from 'busboy-pipe';
import * as fileUploadStreamFactory from 'file-upload-stream-factory';
import * as s3UploadStreamFactory from 's3-upload-stream-factory';
import * as events from 'events';

let router = express.Router();

let eventEmitter = new events.EventEmitter();
eventEmitter.on('begin', (params: busboyPipe.EventParamsBase) => {
    console.log('Piping started');
}).on('end', (params: busboyPipe.EventParamsBase) => {
    console.log('All done :-)');
}).on('total-files-count', (params: busboyPipe.FilesCountParams) => {
    console.log('number of files to pipe: ' + params.count);
});

let filePathMaker = (params: busboyPipe.FilePipeParams) : string => {
    return 'c:/upload/' + params.fileInfo.filename;
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
        return 'busboy_upload/' + params.fileInfo.filename;
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