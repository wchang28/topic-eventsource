/// <reference path="../typings/node/node.d.ts" />
/// <reference path="../typings/express/express.d.ts" />
/// <reference path="../typings/express-serve-static-core/express-serve-static-core.d.ts" />
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

import {router as proxyRouter} from './proxy';
app.use('/proxy', proxyRouter);

let secure_http:boolean = false;
let server: http.Server = http.createServer(app);

server.listen(8080, "127.0.0.1", () => {
	let host = server.address().address; 
	let port = server.address().port; 
	console.log('application listening at %s://%s:%s', (secure_http ? 'https' : 'http'), host, port);    
});