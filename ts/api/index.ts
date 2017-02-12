import * as express from 'express';
import * as core from "express-serve-static-core";
import * as tr from 'rcf-message-router';

let router = express.Router();

let destAuthRouter = express.Router();

let topicAuthRouter = express.Router();
destAuthRouter.use('/topic', topicAuthRouter);

topicAuthRouter.route('/:conn_id')
.all(tr.destAuth((req: tr.DestAuthRequest, res: tr.DestAuthResponse, next: express.NextFunction) => {
    console.log('R USE req=\n' + JSON.stringify(req, null, 2));
    req['user'] = "Wen Chang";
    next();
}))
.get(tr.destAuth((req: tr.DestAuthRequest, res: tr.DestAuthResponse) => {
    console.log('R GET req=\n' + JSON.stringify(req, null, 2));
    if(req.connection.id === req.params["conn_id"])
        res.accept();
    else
        res.reject();
}))
.post(tr.destAuth((req: tr.DestAuthRequest, res: tr.DestAuthResponse) => {
    console.log('R POST req=\n' + JSON.stringify(req, null, 2));
    if(req.connection.id === req.params["conn_id"])
        res.accept();
    else
        res.reject();
}));


let trOptions: tr.Options = {
    connKeepAliveIntervalMS: 5000
    ,destinationAuthorizeRouter: destAuthRouter
};

let ret = tr.get('/event_stream', trOptions);
router.use('/events', ret.router); // topic subscription endpoint is available at /events/event_stream from this route

let connectionsManager = ret.connectionsManager;

connectionsManager.on('change', () => {
    /*
    console.log("");
    console.log("api topic router's connectionsManager changed");
    console.log("======================================================");
    console.log(JSON.stringify(connectionsManager));
    console.log("======================================================");
    console.log("");
    */
}).on('client_connect', (params: tr.ConnectedEventParams) : void => {
    console.log('clinet ' + params.conn_id + ' @ ' + params.remoteAddress + ' connected to the SSE topic endpoint, no. conn = ' + connectionsManager.ConnectionsCount);
}).on('client_disconnect', (params: tr.ConnectedEventParams) : void => {
    console.log('clinet ' + params.conn_id + ' @ ' + params.remoteAddress +  ' disconnected from the SSE topic endpoint, no. conn = ' + connectionsManager.ConnectionsCount);
}).on('on_client_send_msg', (params: tr.ClientSendMsgEventParams) => {
    console.log('\nclinet ' + params.conn_id +' just sent the following message:\n' + JSON.stringify(params.data, null, 2));
});

import * as sobject from './sobject';
import * as upload from './upload';

router.use('/sobject', sobject.router);
router.use('/upload', upload.router);

export {router};