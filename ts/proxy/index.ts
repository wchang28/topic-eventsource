/// <reference path="../../typings/express/express.d.ts" />
/// <reference path="../../typings/express-serve-static-core/express-serve-static-core.d.ts" />
import * as express from 'express';
let router = express.Router();

import {router as topicRouter} from './events';

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
import {ISSETopicProxyRequest} from '../ProxyConnection'
let $ = require('jquery-no-dom');
let $J = (require("ajaxon"))($);
let EventSource = require('eventsource');
let $E = (require('es-factory'))(EventSource);

function topicProxyExtension(req: ISSETopicProxyRequest, res: express.Response, next: express.NextFunction) {
    let instance_url = 'http://127.0.0.1:8080';
    let rejectUnauthorized = false;
    let eventSourcePath = '/api/events/event_stream';
    
    // attach a $J and a $E methods to the Request object BEFORE going into the proxy route as required
	req.$J = (method: string, cmdPath: string, data: any, done: IAjaxonCompletionHandler) : void => {
		let headers = {};   // this can be customize by req
		$J(method, instance_url + eventSourcePath + cmdPath, data, done, headers, rejectUnauthorized);
	};
	req.$E = (done: IEventSourceCreateCompletionHandler) : void => {
		let headers = {};   // this can be customize by req
        $E(instance_url + eventSourcePath, {headers: headers, rejectUnauthorized: rejectUnauthorized}, done);
	};
    next();
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.use('/events', topicProxyExtension, topicRouter);

topicRouter.connectionsManager.on('change', () => {
    console.log("");
    console.log("proxy topic router's connectionsManager changed");
    console.log("======================================================");
    console.log(JSON.stringify(topicRouter.connectionsManager));
    console.log("======================================================");
    console.log("");
});

export {router};