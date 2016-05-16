/// <reference path="../typings/node/node.d.ts" />
/// <reference path="../typings/express/express.d.ts" />
/// <reference path="../typings/express-serve-static-core/express-serve-static-core.d.ts" />
/// <reference path="./Message.ts" />
import * as http from 'http';
import * as express from 'express';
import * as path from 'path';
let app: express.Express = express();

app.use(function(req: express.Request, res: express.Response, next) {
	var req_address = req.connection.remoteAddress;
	console.log('incoming request from ' + req_address + ', path='+ req.path);
	
	next();
});

import {router as apiRouter} from './api';
app.use('/api', apiRouter);

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
let EventSource = require('eventsource');
let $ = require('jquery-no-dom');
let $J = (require("ajaxon"))($);

interface ITopicProxyRequest extends express.Request {
    remoteEventSource: IRemoteEventSourceExtension
}

function proxyMiddleware(req: ITopicProxyRequest, res: express.Response, next) {
    let instance_url = 'http://127.0.0.1:8080';
    let rejectUnauthorized = false;
    let eventSourcePath = '/api/events';
    
    let eventSourceUrl = instance_url + eventSourcePath;
	let ex : IRemoteEventSourceExtension = {
		$C: function(method: string, cmdPath: string, data: any, done: IAjaxonCompletionHandler) {
			let headers = {};   // this can be customize
			$J(method, eventSourceUrl+cmdPath, data, done, headers, rejectUnauthorized);
		},
		$E: function(done: (err: any, eventSource: any) => void) {
			let headers = {};   // this can be customize
			let eventSource = new EventSource(eventSourceUrl, {headers: headers, rejectUnauthorized: rejectUnauthorized});
			eventSource.onopen = () : void  => {done(null, eventSource);};
			eventSource.onerror = (err: any) : void => {done(err, null);};
		}
	};
	req.remoteEventSource = ex;
    next();
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

import {router as proxyRouter} from './proxy';
app.use('/proxy', proxyMiddleware, proxyRouter);

app.use('/app', express.static(path.join(__dirname, '../ui')));

let secure_http:boolean = false;
let server: http.Server = http.createServer(app);

server.listen(8080, "127.0.0.1", () => {
	let host = server.address().address; 
	let port = server.address().port; 
	console.log('application listening at %s://%s:%s', (secure_http ? 'https' : 'http'), host, port);    
});