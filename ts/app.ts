import * as http from 'http';
import * as express from 'express';
import * as path from 'path';
let $ = require('jquery-no-dom');
let EventSource: rcf.EventSourceConstructor = require('eventsource');
import * as rcf from 'rcf';
import * as url from 'url';

let app = express();

app.use(require('no-cache-express'));

app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
	console.log('**********************************************************************');
	let req_address = req.connection.remoteAddress;
	console.log('incoming request from ' + req_address + ', path='+ req.path);
	console.log('headers: ' + JSON.stringify(req.headers));
	console.log('**********************************************************************');
	next();
});

import {router as apiRouter} from './api';
app.use('/api', apiRouter);

function ProxyRestApiMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
	let callOptions: rcf.ApiInstanceConnectOptions = {
		instance_url: 'http://127.0.0.1:8080'
	}
	let api = new rcf.AuthorizedRestApi($, EventSource, rcf.AuthorizedRestApi.connectOptionsToAccess(callOptions));
	req["$A"] = api;
	next();
}

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

let proxyUrl:url.Url = url.parse('http://127.0.0.1:8080');
function ProxyRestApiMiddleware2(req: express.Request, res: express.Response) {
	//console.log('req.path=' +req.path);
	//console.log('req.headers=' +JSON.stringify(req.headers));
	let options:http.RequestOptions = {
		protocol: proxyUrl.protocol
		,hostname: proxyUrl.hostname
		,port: parseInt(proxyUrl.port)
		,method: req.method
		,path: '/api' + req.path
		,headers: {}
	};
	if (req.headers['cache-control']) options.headers['cache-control']=req.headers['cache-control'];
	if (req.headers['accept']) options.headers['accept']=req.headers['accept'];
	if (req.headers['content-type']) options.headers['content-type']=req.headers['content-type'];
	if (req.headers['content-length']) options.headers['content-length']=req.headers['content-length'];
	//options.headers['authorization'] = 'Bearer ' + bearerToken
	let connector = http.request(options, (resp: http.IncomingMessage) => {
		resp.pipe(res);
	});
	req.pipe(connector);
	req.socket.on('close' ,() => {connector.abort();});
}

app.use('/proxy', ProxyRestApiMiddleware2);

/*
import {router as proxyRouter} from './proxy';
app.use('/proxy', ProxyRestApiMiddleware, proxyRouter);
*/


app.use('/app', express.static(path.join(__dirname, '../ui')));

let secure_http:boolean = false;
let server: http.Server = http.createServer(app);

server.listen(8080, "127.0.0.1", () => {
	let host = server.address().address; 
	let port = server.address().port; 
	console.log('application listening at %s://%s:%s', (secure_http ? 'https' : 'http'), host, port);    
});