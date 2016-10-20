import * as express from 'express';
import * as core from "express-serve-static-core";
import * as tr from 'rcf-message-router';

let router = express.Router();

let topicAuthApp = express();

topicAuthApp.use('/topic/say_hi', (req:express.Request, res:express.Response, next: express.NextFunction) => {
    let {authReq, authRes} = tr.getDestinationAuthReqRes(req, res);
    console.log('USE /topic/say_hi:' + JSON.stringify(authReq, null, 2));
    next();
});

topicAuthApp.get('/topic/say_hi', (req:express.Request, res:express.Response, next: express.NextFunction) => {
    let {authReq, authRes} = tr.getDestinationAuthReqRes(req, res);
    console.log('<GET/SUBSCRIBE>: /topic/say_hi');
    authRes.accept();
});

topicAuthApp.post('/topic/say_hi', (req:express.Request, res:express.Response, next: express.NextFunction) => {
    let {authReq, authRes} = tr.getDestinationAuthReqRes(req, res);
    console.log('<POST/SEND>: /topic/say_hi');
    //authRes.reject("not authorized :-(");
    authRes.accept();
});

let trOptions: tr.Options = {
    pingIntervalMS: 5000
    ,destinationAuthorizeApp: topicAuthApp
};

let topicRouter = tr.getRouter('/event_stream', trOptions);
router.use('/events', topicRouter); // topic subscription endpoint is available at /events/event_stream from this route

topicRouter.connectionsManager.on('change', () => {
    console.log("");
    console.log("api topic router's connectionsManager changed");
    console.log("======================================================");
    console.log(JSON.stringify(topicRouter.connectionsManager));
    console.log("======================================================");
    console.log("");
});
topicRouter.eventEmitter.on('client_connect', (params: tr.ConnectedEventParams) : void => {
    console.log('clinet ' + params.conn_id + ' @ ' + params.remoteAddress + ' connected to the SSE topic endpoint, no. conn = ' + topicRouter.connectionsManager.ConnectionsCount);
}).on('client_disconnect', (params: tr.ConnectedEventParams) : void => {
    console.log('clinet ' + params.conn_id + ' @ ' + params.remoteAddress +  ' disconnected from the SSE topic endpoint, no. conn = ' + topicRouter.connectionsManager.ConnectionsCount);
}).on('on_client_send_msg', (params: tr.ClientSendMsgEventParams) => {
    console.log('\nclinet just sent the following message:\n' + JSON.stringify(params, null, 2));
});

import * as sobject from './sobject';
import * as upload from './upload';

router.use('/sobject', sobject.router);
router.use('/upload', upload.router);

export {router};