import * as http from 'http';
import * as express from 'express';
import * as path from 'path';
let $ = require('jquery-no-dom');
let EventSource: rcf.EventSourceConstructor = require('eventsource');
import * as rcf from 'rcf';
import * as url from 'url';

let appApi = express();
let appProxy = express();

appApi.use(require('no-cache-express'));
appProxy.use(require('no-cache-express'));

let requestLogger = (req: express.Request, res: express.Response, next: express.NextFunction) => {
	console.log('**********************************************************************');
	let req_address = req.connection.remoteAddress;
	console.log('incoming request from ' + req_address + ', path='+ req.path);
	console.log('headers: ' + JSON.stringify(req.headers));
	console.log('**********************************************************************');
	next();
};

appApi.use(requestLogger);
appProxy.use(requestLogger);

import {router as apiRouter} from './api';
appApi.use('/api', apiRouter);

/*
function ProxyRestApiMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
	let callOptions: rcf.ApiInstanceConnectOptions = {
		instance_url: 'http://127.0.0.1:8080'
	}
	let api = new rcf.AuthorizedRestApi($, EventSource, rcf.AuthorizedRestApi.connectOptionsToAccess(callOptions));
	req["$A"] = api;
	next();
}
*/

/*
function ProxyRestApiMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
	let tokenRefresher: IOAuth2TokenRefresher = null;
	let api = new AuthorizedRestApi($, EventSource, req.session.access, tokenRefresher);
	api.on('on_access_refreshed', (newAccess: IOAuth2Access) : void => {
		req.session.access = newAccess;
	});
	req["$A"] = api;
	next();
}
*/

import * as _ from 'lodash';

let proxyUrl:url.Url = url.parse('http://127.0.0.1:8081');
function ProxyRestApiMiddleware2(req: express.Request, res: express.Response) {
	let options:http.RequestOptions = {
		protocol: proxyUrl.protocol
		,hostname: proxyUrl.hostname
		,port: parseInt(proxyUrl.port)
		,method: req.method
		,path: '/api' + req.path
	};
	options.headers = _.assignIn(req.headers);
	delete options.headers['host'];
	/*
	if (req.headers['cache-control']) options.headers['cache-control']=req.headers['cache-control'];
	if (req.headers['accept']) options.headers['accept']=req.headers['accept'];
	if (req.headers['content-type']) options.headers['content-type']=req.headers['content-type'];
	if (req.headers['content-length']) options.headers['content-length']=req.headers['content-length'];
	options.headers['authorization'] = 'Bearer ' + bearerToken
	*/
	let connector = http.request(options, (resp: http.IncomingMessage) => {
		res.writeHead(resp.statusCode, resp.statusMessage, resp.headers);
		resp.pipe(res);
		req.socket.on('close', () => {
			console.log('');
			console.log('pipe finished for ' + req.path);
			console.log('');
		});
	});
	req.pipe(connector);
	req.socket.on('close' ,() => {connector.abort();});
}

appProxy.use('/proxy', ProxyRestApiMiddleware2);

/*
import {router as proxyRouter} from './proxy';
appProxy.use('/proxy', ProxyRestApiMiddleware, proxyRouter);
*/


appProxy.use('/app', express.static(path.join(__dirname, '../ui')));

let secure_http:boolean = false;
let apiServer: http.Server = http.createServer(appApi);

apiServer.listen(8081, "127.0.0.1", () => {
	let host = apiServer.address().address; 
	let port = apiServer.address().port; 
	console.log('Api server listening at %s://%s:%s', (secure_http ? 'https' : 'http'), host, port);   

	let proxyServer: http.Server = http.createServer(appProxy);

	proxyServer.listen(8080, "127.0.0.1", () => {
		let host = proxyServer.address().address; 
		let port = proxyServer.address().port; 
		console.log('Proxy server listening at %s://%s:%s', (secure_http ? 'https' : 'http'), host, port);   
	});
});