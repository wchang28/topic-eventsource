import * as express from 'express';
import * as core from "express-serve-static-core";
import * as rcf from 'rcf';
import * as tr from '../sse-topic-router/SSETopicRouter';
import * as proxy from '../sse-topic-proxy/ProxyConnection';

let router = express.Router();

let get$A = (req: express.Request): rcf.IAuthorizedApi => {
    return req["$A"];
}

let proxyOptions: proxy.Options = {
	eventSourcePath: '/api/events/event_stream'
	,getAuthorizedApi: get$A
};

let topicRouter = tr.getRouter('/event_stream', proxy.getConnectionFactory(proxyOptions));
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