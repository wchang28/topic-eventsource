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

interface IAuthorizedRequest extends express.Request {
    $A: IAuthorized$;
}

import {UnAuthorizedWorkflow, IUnauthorizedAccess} from './OAuth2TokenRefreshWorkflow';

function AuthorizedExtension(req: IAuthorizedRequest, res: express.Response, next: express.NextFunction) {
	let rejectUnauthorized = false;
	let access: IUnauthorizedAccess = {
		instance_url: 'http://127.0.0.1:8080'
	}
	let workflow = new UnAuthorizedWorkflow($J, $E, access, rejectUnauthorized);
	let $A: IAuthorized$ = {
		$J: (method: string, pathname: string, data:any, done: ICompletionHandler) : void => {
			workflow.$J(method, pathname, data, done);
		}
		,$E: (pathname: string, done: ICompletionHandler) : void => {
			workflow.$E(pathname, done);
		}
	};
	req.$A = $A;
	next();
}

/*
import {OAuth2TokenRefreshWorkflow, IOAuth2Access, IOAuth2TokenRefresher} from './OAuth2TokenRefreshWorkflow';

function OAuth2AuthorizedExtension(req: IAuthorizedRequest, res: express.Response, next: express.NextFunction) {
	let rejectUnauthorized = false;
	let tokenRefresher: IOAuth2TokenRefresher = null;
	let workflow = new OAuth2TokenRefreshWorkflow($J, $E, req.session.access, tokenRefresher, rejectUnauthorized);
	workflow.on('on_access_refreshed', (newAccess: IOAuth2Access) : void => {
		req.session.access = newAccess;
	});
	let $A: IAuthorized$ = {
		$J: (method: string, pathname: string, data:any, done: ICompletionHandler) : void => {
			workflow.$J(method, pathname, data, done);
		}
		,$E: (pathname: string, done: ICompletionHandler) : void => {
			workflow.$E(pathname, done);
		}
	};
	req.$A = $A;
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