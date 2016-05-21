/// <reference path="../../typings/express/express.d.ts" />
/// <reference path="../../typings/express-serve-static-core/express-serve-static-core.d.ts" />
import * as express from 'express';
let router = express.Router();

import {getRouter as getTopicRouter} from '../SSETopicRouter';
import {getConnectionFactory} from '../TopicConnection';

let topicRouter = getTopicRouter('/event_stream', getConnectionFactory(5000));
router.use('/events', topicRouter);

topicRouter.connectionsManager.on('change', () => {
    console.log("");
    console.log("api topic router's connectionsManager changed");
    console.log("======================================================");
    console.log(JSON.stringify(topicRouter.connectionsManager));
    console.log("======================================================");
    console.log("");
});

topicRouter.eventEmitter.on('sse_connect', (remoteAddress: string) : void => {
    console.log('remote host ' + remoteAddress + ' connected to the SSE endpoint');
});

topicRouter.eventEmitter.on('sse_disconnect', (remoteAddress: string) : void => {
    console.log('remote host ' + remoteAddress + ' disconnected from the SSE endpoint');
});

export {router};