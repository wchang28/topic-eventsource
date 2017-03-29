import * as http from 'http';
import * as express from 'express';
import * as path from 'path';
import * as bodyParser from 'body-parser';
import * as ews from 'express-web-server';
import * as fs from 'fs';
import * as proxy from 'express-http-proxy'
import * as prettyPrinter from 'express-pretty-print'; 
import * as events from 'events';

interface IAppConfig {
    apiServer: ews.IWebServerConfig;
    proxyServer: ews.IWebServerConfig;
	proxyTarget: proxy.TargetSettings;
}

let configFile = (process.argv.length < 3 ? path.join(__dirname, '../local_testing_config.json') : process.argv[2]);
let config: IAppConfig = JSON.parse(fs.readFileSync(configFile, 'utf8'));

let appApi = express();
let appProxy = express();

appApi.use(require('no-cache-express'));
appProxy.use(require('no-cache-express'));

appApi.use(bodyParser.json());

appApi.use(prettyPrinter.get());

let requestLogger = (req: express.Request, res: express.Response, next: express.NextFunction) => {
	console.log('**********************************************************************');
	let req_address = req.connection.remoteAddress + ':' + req.connection.remotePort.toString();
	console.log('incoming "' + req.method.toUpperCase() + '" request from ' + req_address + ', url='+ req.url);
	console.log('headers: ' + JSON.stringify(req.headers));
	console.log('**********************************************************************');
	next();
};

appApi.use(requestLogger);

import {router as apiRouter} from './api';
appApi.use('/services', apiRouter);

let targetAcquisition: proxy.TargetAcquisition = (req:express.Request) => Promise.resolve<proxy.TargetSettings>(config.proxyTarget);

let eventEmitter = new events.EventEmitter();

eventEmitter.on('error', (err: any) => {
    console.error(new Date().toISOString() + ": !!! Proxy error: " + JSON.stringify(err));
});

let proxyMiddleware = proxy.get({targetAcquisition, eventEmitter});

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