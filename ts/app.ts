/// <reference path="../typings/node/node.d.ts" />
/// <reference path="../typings/express/express.d.ts" />
/// <reference path="../typings/express-serve-static-core/express-serve-static-core.d.ts" />
/// <reference path="./Message.ts" />
import * as http from 'http';
import * as express from 'express';
import * as path from 'path';
let $ = require('jquery-no-dom');
let $J = (require("ajaxon"))($);
let EventSource = require('eventsource');
let $E = (require('es-factory'))(EventSource);

let app: express.Express = express();

app.use(require('no-cache-express'));

app.use(function(req: express.Request, res: express.Response, next: express.NextFunction) {
	var req_address = req.connection.remoteAddress;
	console.log('incoming request from ' + req_address + ', path='+ req.path);
	next();
});

import {router as apiRouter} from './api';
app.use('/api', apiRouter);

import {IAuthorizedRequest} from './AuthorizedRequest';

import {UnAuthorizedWorkflow} from './OAuth2TokenRefreshWorkflows';
function AuthorizedExtension(req: IAuthorizedRequest, res: express.Response, next: express.NextFunction) {
	let instance_url = 'http://127.0.0.1:8080';
	let instanceUrlRejectUnauthorized = false;
	let workflow = new UnAuthorizedWorkflow($J, $E, instance_url, instanceUrlRejectUnauthorized);
	req.$A = workflow;
	next();
}

/*
import {OAuth2TokenRefreshWorkflow, IOAuth2Access, IOAuth2TokenRefresher} from './OAuth2TokenRefreshWorkflows';
function AuthorizedExtension(req: IAuthorizedRequest, res: express.Response, next: express.NextFunction) {
	let instanceUrlRejectUnauthorized = false;
	let tokenRefresher: IOAuth2TokenRefresher = null;
	let workflow = new OAuth2TokenRefreshWorkflow($J, $E, req.session.access, tokenRefresher, instanceUrlRejectUnauthorized);
	workflow.on('on_access_refreshed', (newAccess: IOAuth2Access) : void => {
		req.session.access = newAccess;
	});
	req.$A = workflow;
	next();
}
*/

import {router as proxyRouter} from './proxy';
app.use('/proxy', AuthorizedExtension, proxyRouter);

app.use('/app', express.static(path.join(__dirname, '../ui')));

let secure_http:boolean = false;
let server: http.Server = http.createServer(app);

server.listen(8080, "127.0.0.1", () => {
	let host = server.address().address; 
	let port = server.address().port; 
	console.log('application listening at %s://%s:%s', (secure_http ? 'https' : 'http'), host, port);    
});