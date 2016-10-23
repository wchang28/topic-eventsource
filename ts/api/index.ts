import * as express from 'express';
import * as core from "express-serve-static-core";
import * as tr from 'rcf-message-router-2';

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
    if(req.conn_id === req.params["conn_id"])
        res.accept();
    else
        res.reject();
}))
.post(tr.destAuth((req: tr.DestAuthRequest, res: tr.DestAuthResponse) => {
    console.log('R POST req=\n' + JSON.stringify(req, null, 2));
    if(req.conn_id === req.params["conn_id"])
        res.accept();
    else
        res.reject();
}));


let trOptions: tr.Options = {
    pingIntervalMS: 5000
    ,destinationAuthorizeRouter: destAuthRouter
};

let topicRouter = tr.getRouter('/event_stream', trOptions);
router.use('/events', topicRouter); // topic subscription endpoint is available at /events/event_stream from this route

topicRouter.connectionsManager.on('change', () => {
    /*
    console.log("");
    console.log("api topic router's connectionsManager changed");
    console.log("======================================================");
    console.log(JSON.stringify(topicRouter.connectionsManager));
    console.log("======================================================");
    console.log("");
    */
});
topicRouter.eventEmitter.on('client_connect', (params: tr.ConnectedEventParams) : void => {
    console.log('clinet ' + params.conn_id + ' @ ' + params.remoteAddress + ' connected to the SSE topic endpoint, no. conn = ' + topicRouter.connectionsManager.ConnectionsCount);
}).on('client_disconnect', (params: tr.ConnectedEventParams) : void => {
    console.log('clinet ' + params.conn_id + ' @ ' + params.remoteAddress +  ' disconnected from the SSE topic endpoint, no. conn = ' + topicRouter.connectionsManager.ConnectionsCount);
}).on('on_client_send_msg', (params: tr.ClientSendMsgEventParams) => {
    console.log('\nclinet ' + params.conn_id +' just sent the following message:\n' + JSON.stringify(params.data, null, 2));
});

import * as sobject from './sobject';
import * as upload from './upload';

router.use('/sobject', sobject.router);
router.use('/upload', upload.router);

export {router};