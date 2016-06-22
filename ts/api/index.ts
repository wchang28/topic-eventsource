import * as express from 'express';
import * as core from "express-serve-static-core";
let router = express.Router();

import {getRouter as getTopicRouter} from '../sse-topic-router/SSETopicRouter';
import {getConnectionFactory} from '../sse-topic-conn/TopicConnection';

let topicRouter = getTopicRouter('/event_stream', getConnectionFactory(5000));
router.use('/events', topicRouter); // topic subscription endpoint is available at /events/event_stream from this route

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