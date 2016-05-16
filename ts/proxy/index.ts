/// <reference path="../../typings/express/express.d.ts" />
/// <reference path="../../typings/express-serve-static-core/express-serve-static-core.d.ts" />
import * as express from 'express';
let router = express.Router();

import {router as topicRouter} from './events';

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
import {ITopicProxyRequest} from '../ProxyConnection'
let EventSource = require('eventsource');
let $ = require('jquery-no-dom');
let $J = (require("ajaxon"))($);

function topicProxyExtension(req: ITopicProxyRequest, res: express.Response, next: express.NextFunction) {
    let instance_url = 'http://127.0.0.1:8080';
    let rejectUnauthorized = false;
    let eventSourcePath = '/api/events/event_stream';
    
    let eventSourceUrl = instance_url + eventSourcePath;
	req.$C = function(method: string, cmdPath: string, data: any, done: IAjaxonCompletionHandler) {
		let headers = {};   // this can be customize
		$J(method, eventSourceUrl+cmdPath, data, done, headers, rejectUnauthorized);
	};
	req.$E = function(done: (err: any, eventSource: any) => void) {
		let headers = {};   // this can be customize
		let eventSource = new EventSource(eventSourceUrl, {headers: headers, rejectUnauthorized: rejectUnauthorized});
		eventSource.onopen = () : void  => {done(null, eventSource);};
		eventSource.onerror = (err: any) : void => {done(err, null);};
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