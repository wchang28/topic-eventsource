import * as http from 'http';
import * as express from 'express';
import * as path from 'path';
import * as bodyParser from 'body-parser';
import * as ews from 'express-web-server';
import * as fs from 'fs';
import * as proxy from 'rcf-http-proxy'

interface IAppConfig {
    apiServer: ews.IWebServerConfig;
    proxyServer: ews.IWebServerConfig;
	proxyTarget: proxy.TargetSettings
}

let configFile = (process.argv.length < 3 ? path.join(__dirname, '../local_testing_config.json') : process.argv[2]);
let config: IAppConfig = JSON.parse(fs.readFileSync(configFile, 'utf8'));

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

let proxyMiddleware = proxy.get(config.proxyTarget);

appProxy.use('/services', proxyMiddleware);

appProxy.use('/', express.static(path.join(__dirname, '../ui')));
appProxy.use('/bower_components', express.static(path.join(__dirname, '../bower_components')));

// catch all
////////////////////////////////////////////////////////////////////////////////////////
appProxy.use((req: express.Request, res: express.Response) => {
    req.on('data', (data) => {});
    req.on("end" ,() => {
        res.status(400).json({error: 'bad request'});
    });
});

appApi.use((req: express.Request, res: express.Response) => {
    req.on('data', (data) => {});
    req.on("end" ,() => {
        res.status(400).json({error: 'bad request'});
    });
});
////////////////////////////////////////////////////////////////////////////////////////

ews.startServer(config.apiServer, appApi, (secure:boolean, host:string, port:number) => {
	console.log('Api server listening at %s://%s:%s', (secure ? 'https' : 'http'), host, port);

	ews.startServer(config.proxyServer, appProxy, (secure:boolean, host:string, port:number) => {
		console.log('Proxy server listening at %s://%s:%s', (secure ? 'https' : 'http'), host, port);
	});
});