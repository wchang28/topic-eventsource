import {IConnection, IConnectionFactory} from '../common/MsgConnection';
import {IMessage, IMessageCallback, DoneHandler, ErrorHandler} from '../common/MessageInterfaces';
import * as uuid from 'node-uuid';
import * as events from 'events';
import * as express from 'express';
import * as bodyParser from 'body-parser';

export interface IConnectionCreatedHandler {
    (err: any, conn_id: string) : void;
}

// this class emits the following events
// 1. change
export class ConnectionsManager extends events.EventEmitter
{
    private connCount: number;
    private __connections : {[conn_id: string]: IConnection;}
    constructor() {
        super();
        this.connCount = 0;
        this.__connections = {};
    }
    getConnectionsCount() : number { return this.connCount;}
    createConnection(req: any, connectionFactory: IConnectionFactory, remoteAddress: string, messageCB: IMessageCallback, errorCB: ErrorHandler, done: IConnectionCreatedHandler) : void {
        let conn_id = uuid.v4();
        connectionFactory(req, conn_id, remoteAddress, messageCB, errorCB, (err: any, conn: IConnection) => {
            if (err) {
                done(err, null);
            } else {
                this.__connections[conn_id] = conn;
                conn.onChange(() => {
                    this.emit('change');
                });
                this.connCount++;
                this.emit('change');
                done(null, conn_id);
            }
        });
    }
    removeConnection(conn_id: string) : void {
        let conn = this.__connections[conn_id];
        if (conn) {
            conn.end();
            delete this.__connections[conn_id];
            this.connCount--;
            this.emit('change');
        }     
    }
    addSubscription(req: any, conn_id: string, sub_id:string, destination: string, headers:{[field: string]: any}, done?: DoneHandler)  {
        let conn = this.__connections[conn_id];
        if (conn) {
            conn.addSubscription(req, sub_id, destination, headers, done);
        } else {
            if (typeof done === 'function') done('bad connection');
        }
    }
    removeSubscription(req: any, conn_id: string, sub_id:string, done?: DoneHandler) {
        let conn = this.__connections[conn_id];
        if (conn) {
            conn.removeSubscription(req, sub_id, done);
        } else {
            if (typeof done === 'function') done('bad connection');
        }        
    }
    forwardMessage(req: any, conn_id: string, destination: string, headers: {[field: string]:any}, message:any, done?: DoneHandler) {
        let srcConn = this.__connections[conn_id];
        let left = this.connCount;
        if (srcConn) {
            var errs = [];
            for (var id in this.__connections) {    // for each connection
                let conn = this.__connections[id];
                conn.forwardMessage(req, srcConn, destination, headers, message, (err: any) => {
                    left--;
                    if (err) errs.push(err);
                    if (left === 0) {
                        if (typeof done === 'function') done(errs.length > 0 ? errs : null);
                    }
                });
            }
        } else {
            if (typeof done === 'function') done('bad connection');
        }      
    }
    toJSON() : Object {
        let ret = [];
        for (var conn_id in this.__connections) {
            let conn = this.__connections[conn_id];
            ret.push(conn.toJSON());
        }
        return ret;
    }
}

interface SSEResponse extends express.Response {
    sseSend: (msg:any) => void;
}

export interface ISSETopicRouter extends express.Router {
    connectionsManager: ConnectionsManager;
    eventEmitter: events.EventEmitter;
}

export function getRouter(eventPath: string, connectionFactory: IConnectionFactory) : ISSETopicRouter {
    let router: ISSETopicRouter  = <ISSETopicRouter>express.Router();
    router.use(bodyParser.json({'limit': '100mb'}));
    let connectionsManager = new ConnectionsManager();
    router.connectionsManager = connectionsManager;
    router.eventEmitter = new events.EventEmitter();
    
    // server side events streaming
    router.get(eventPath, (req: express.Request, res: SSEResponse) => {
        let remoteAddress = req.connection.remoteAddress+':'+req.connection.remotePort.toString();
        router.eventEmitter.emit('sse_connect', remoteAddress);
        
        // init SSE
        ///////////////////////////////////////////////////////////////////////
        //send headers for event-stream connection
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        });
        // add a sseSend() method to the result object
        res.sseSend = function(data: any, event? : any) {
            if (event) res.write("event: " + event.toString() + "\n");
            res.write("data: " + JSON.stringify(data) + "\n\n");
        }
        res.write('\n');
        ///////////////////////////////////////////////////////////////////////
		
        let conn_id: string = '';
        // initialize event streaming
        ///////////////////////////////////////////////////////////////////////
        connectionsManager.createConnection(
        req
        ,connectionFactory
        ,remoteAddress
        ,(msg: IMessage) => {res.sseSend(msg);}
        ,(err: any) => {req.socket.end();}
        ,(err: any, connnection_id: string) => {
            if (err)    // connection cannot be created due to some error
                req.socket.end();   // close the socket, this will trigger req.on("close")
            else {
                conn_id = connnection_id;
                router.eventEmitter.emit('client_connect', {remoteAddress:remoteAddress, conn_id: conn_id});
            }
        });
        ///////////////////////////////////////////////////////////////////////
		
        // The 'close' event is fired when a user closes their browser window.
        req.on("close", function() {
            router.eventEmitter.emit('sse_disconnect', remoteAddress);
            if (conn_id.length > 0) {
                router.eventEmitter.emit('client_disconnect', {remoteAddress:remoteAddress, conn_id: conn_id});
                connectionsManager.removeConnection(conn_id);
            }
        });
    });
    
    router.post(eventPath + '/subscribe', function(req: express.Request, res: express.Response) {
        let remoteAddress = req.connection.remoteAddress+':'+req.connection.remotePort.toString();
        let data = req.body;
        router.eventEmitter.emit('client_cmd', {remoteAddress:remoteAddress, cmd: 'subscribe', data: data});
        connectionsManager.addSubscription(req, data.conn_id, data.sub_id, data.destination, data.headers, (err: any) => {
            if (err) {
                res.jsonp({exception: JSON.parse(JSON.stringify(err))});
            } else {
                res.jsonp({});
            }
        });
    });

    router.get(eventPath + '/unsubscribe', function(req: express.Request, res: express.Response) {
        let remoteAddress = req.connection.remoteAddress+':'+req.connection.remotePort.toString();
        let data = req.query;
        router.eventEmitter.emit('client_cmd', {remoteAddress:remoteAddress, cmd: 'unsubscribe', data: data});
        connectionsManager.removeSubscription(req, data.conn_id, data.sub_id, (err: any) => {
            if (err) {
                res.jsonp({exception: JSON.parse(JSON.stringify(err))});
            } else {
                res.jsonp({});
            }       
        });
    });

    router.post(eventPath + '/send', function(req: express.Request, res: express.Response) {
        let remoteAddress = req.connection.remoteAddress+':'+req.connection.remotePort.toString();
        let data = req.body;
        router.eventEmitter.emit('client_cmd', {remoteAddress:remoteAddress, cmd: 'send', data: data});
        connectionsManager.forwardMessage(req, data.conn_id, data.destination, data.headers, data.body, (err: any) => {
            if (err) {
                res.jsonp({exception: JSON.parse(JSON.stringify(err))});
            } else {
                res.jsonp({});
            }          
        });
    });
    
    return router;
}