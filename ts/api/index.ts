import * as express from 'express';
import * as core from "express-serve-static-core";
import * as tr from 'rcf-msg-router';
import * as tc from 'rcf-topic-conn';

let router = express.Router();

let tcOptions: tc.Options = {
    pingIntervalMS: 5000
};

let topicRouter = tr.getRouter('/event_stream', tc.getConnectionFactory(tcOptions));
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
    console.log('clinet ' + params.conn_id + ' @ ' + params.remoteAddress + ' connected to the SSE topic endpoint');
});

topicRouter.eventEmitter.on('client_disconnect', (params: tr.ConnectedEventParams) : void => {
    console.log('clinet ' + params.conn_id + ' @ ' + params.remoteAddress +  ' disconnected from the SSE topic endpoint');
});

import * as sobject from './sobject';
import * as upload from './upload';

router.use('/sobject', sobject.router);
router.use('/upload', upload.router);

export {router};