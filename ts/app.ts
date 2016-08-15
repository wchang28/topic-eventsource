import * as http from 'http';
import * as express from 'express';
import * as path from 'path';
import * as bodyParser from 'body-parser';

let appApi = express();
let appProxy = express();

appApi.use(require('no-cache-express'));
appProxy.use(require('no-cache-express'));

appApi.use(bodyParser.json());

let requestLogger = (req: express.Request, res: express.Response, next: express.NextFunction) => {
	console.log('**********************************************************************');
	let req_address = req.connection.remoteAddress;
	console.log('incoming request from ' + req_address + ', path='+ req.path);
	console.log('headers: ' + JSON.stringify(req.headers));
	console.log('**********************************************************************');
	next();
};

appApi.use(requestLogger);

import {router as apiRouter} from './api';
appApi.use('/services', apiRouter);

/*
import * as url from 'url';
import * as _ from 'lodash';

function ProxyRestApiMiddleware(req: express.Request, res: express.Response) {
	let target = 'http://127.0.0.1:8081/services';
	let targetUrl:url.Url = url.parse(target);
	let options:http.RequestOptions = {
		protocol: targetUrl.protocol
		,hostname: targetUrl.hostname
		,port: parseInt(targetUrl.port)
		,method: req.method
		,path: targetUrl.pathname + req.url
	};
	options.headers = _.assignIn(req.headers);
	delete options.headers['host'];
	console.log('options.path=' + options.path);

	// options.headers['authorization'] = 'Bearer ' + bearerToken

	let proxyReq = http.request(options, (proxyRes: http.IncomingMessage) => {
		res.writeHead(proxyRes.statusCode, proxyRes.statusMessage, proxyRes.headers);
		proxyRes.on('error', (err) => {}).pipe(res).on('error', (err) => {});	// proxyRes ===> res
	});
    req.on('error', (err) => {}).pipe(proxyReq).on('error', (err) => {}); // req ===> proxyReq
    req.socket.on('close' ,() => {
        proxyReq.abort();
    });
}

appProxy.use('/services', ProxyRestApiMiddleware);
*/

import * as httpProxy from 'http-proxy';

function ApiProxyMiddleware(req: express.Request, res: express.Response) {
    let proxy = httpProxy.createProxyServer();
    let options: httpProxy.ServerOptions = {
         target: 'http://127.0.0.1:8081/services'
         ,changeOrigin: true    // change the 'host' header field to target host
		 //,secure: true/false	// rejectUnauthorized
    };
    proxy.web(req, res, options);
    proxy.on('error', (err:any, req: express.Request, res:express.Response) => {
        console.log('proxy error: ' + JSON.stringify(err));
        res.status(500).json({'error': 'internal server error'});
    });
    proxy.on('proxyReq', (proxyReq:http.ClientRequest, req: express.Request, res: express.Response, options: httpProxy.ServerOptions) => {
        //console.log('proxyReq()');
        //proxyReq.setHeader('authorization', 'Bearer ' + bearerToken);
    });
    proxy.on('proxyRes', (proxyRes:http.IncomingMessage, req: express.Request, res: express.Response) => {
        //console.log('proxyRes()');
    });
}

appProxy.use('/services', ApiProxyMiddleware);


appProxy.use('/', express.static(path.join(__dirname, '../ui')));

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