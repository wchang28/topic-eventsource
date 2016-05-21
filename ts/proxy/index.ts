/// <reference path="../../typings/express/express.d.ts" />
/// <reference path="../../typings/express-serve-static-core/express-serve-static-core.d.ts" />
import * as express from 'express';
let router = express.Router();

import {getRouter as getTopicRouter} from '../SSETopicRouter';
import {getConnectionFactory} from '../ProxyConnection';

let topicRouter = getTopicRouter('/event_stream', getConnectionFactory('/api/events/event_stream'));
router.use('/events', topicRouter);

topicRouter.connectionsManager.on('change', () => {
    console.log("");
    console.log("proxy topic router's connectionsManager changed");
    console.log("======================================================");
    console.log(JSON.stringify(topicRouter.connectionsManager));
    console.log("======================================================");
    console.log("");
});

export {router};