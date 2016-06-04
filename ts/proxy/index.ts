import * as express from 'express';
import * as core from "express-serve-static-core";
let router = express.Router();

import {getRouter as getTopicRouter} from '../SSETopicRouter';
import {getConnectionFactory} from '../ProxyConnection';

let topicRouter = getTopicRouter('/event_stream', getConnectionFactory('/api/events/event_stream'));
router.use('/events', topicRouter); // topic subscription endpoint is available at /events/event_stream from this route

topicRouter.connectionsManager.on('change', () => {
    console.log("");
    console.log("proxy topic router's connectionsManager changed");
    console.log("======================================================");
    console.log(JSON.stringify(topicRouter.connectionsManager));
    console.log("======================================================");
    console.log("");
});

export {router};