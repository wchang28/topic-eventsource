import * as http from 'http';
import * as express from 'express';
import * as path from 'path';
let $ = require('jquery-no-dom');
let EventSource = require('eventsource');
import * as rcf from 'rcf'; 

let app: express.Express = express();

app.use(require('no-cache-express'));

app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
	var req_address = req.connection.remoteAddress;
	console.log('incoming request from ' + req_address + ', path='+ req.path);
	next();
});

import {router as apiRouter} from './api';
app.use('/api', apiRouter);

import {NoAuthorizationRestApi} from './restApi';
function RestApiMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
	let callOptions: rcf.ApiInstanceConnectOptions = {
		instance_url: 'http://127.0.0.1:8080'
	}
	let api = new NoAuthorizationRestApi($, EventSource, callOptions);
	req["$A"] = api;
	next();
}

/*
import {IOauth2RestApi, IOAuth2Access, IOAuth2TokenRefresher} from './RestApi';
function RestApiMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
	let tokenRefresher: IOAuth2TokenRefresher = null;
	let api = new IOauth2RestApi($, EventSource, req.session.access, tokenRefresher);
	api.on('on_access_refreshed', (newAccess: IOAuth2Access) : void => {
		req.session.access = newAccess;
	});
	req["$A"] = api;
	next();
}
*/

import {router as proxyRouter} from './proxy';
app.use('/proxy', RestApiMiddleware, proxyRouter);

app.use('/app', express.static(path.join(__dirname, '../ui')));

let secure_http:boolean = false;
let server: http.Server = http.createServer(app);

server.listen(8080, "127.0.0.1", () => {
	let host = server.address().address; 
	let port = server.address().port; 
	console.log('application listening at %s://%s:%s', (secure_http ? 'https' : 'http'), host, port);    
});