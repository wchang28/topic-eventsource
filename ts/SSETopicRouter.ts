/// <reference path="../typings/express/express.d.ts" />
/// <reference path="../typings/express-serve-static-core/express-serve-static-core.d.ts" />
/// <reference path="../typings/node/node.d.ts" />
/// <reference path="../typings/node-uuid/node-uuid.d.ts" />
/// <reference path="../typings/body-parser/body-parser.d.ts" />
/// <reference path="Message.ts" />
import * as uuid from 'node-uuid';
import * as events from 'events';
import * as express from 'express';
import * as bodyParser from 'body-parser';

interface IConnectionCreateDoneHandler {
    (err: any, conn_id: string) : void;
}

class ConnectionsManager extends events.EventEmitter
{
    private connCount: number;
    private __connections : {[conn_id: string]: IConnection;}
    constructor() {
        super();
        this.connCount = 0;
        this.__connections = {};
    }
    getConnectionsCount() : number { return this.connCount;}
    createConnection(connectionFactory: IConnectionFactory, remoteAddress: string, messageCB: IMessageCallback, errorCB: ErrorHandler, done: IConnectionCreateDoneHandler) : void {
        let conn_id = uuid.v4();
        connectionFactory(conn_id, remoteAddress, messageCB, errorCB, (err: any, conn: IConnection) => {
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
    addSubscription(conn_id: string, sub_id:string, destination: string, headers:{[field: string]: any}, done?: DoneHandler)  {
        let conn = this.__connections[conn_id];
        if (conn) {
            conn.addSubscription(sub_id, destination, headers, done);
        } else {
            if (typeof done === 'function') done('bad connection');
        }
    }
    removeSubscription(conn_id: string, sub_id:string, done?: DoneHandler) {
        let conn = this.__connections[conn_id];
        if (conn) {
            conn.removeSubscription(sub_id, done);
        } else {
            if (typeof done === 'function') done('bad connection');
        }        
    }
    forwardMessage(conn_id: string, destination: string, headers: {[field: string]:any}, message:any, done?: DoneHandler) {
        let srcConn = this.__connections[conn_id];
        let left = this.connCount;
        if (srcConn) {
            var errs = [];
            for (var id in this.__connections) {    // for each connection
                let conn = this.__connections[id];
                conn.forwardMessage(srcConn, destination, headers, message, (err: any) => {
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

interface IConnectionsManagedRouter extends express.Router {
    connectionsManager: ConnectionsManager;
    eventSource: events.EventEmitter;
}

export function get_router(eventPath: string, connectionFactoryFactory: IConnectionFactoryFactory, cookieSetter?: ICookieSetter) : IConnectionsManagedRouter {
    let router: IConnectionsManagedRouter  = <IConnectionsManagedRouter>express.Router();
    router.use(bodyParser.json({'limit': '100mb'}));
    let connectionsManager = new ConnectionsManager();
    router.connectionsManager = connectionsManager;
    router.eventSource = new events.EventEmitter();
    
    // server side events streaming
    router.get(eventPath, (req: express.Request, res: SSEResponse) => {
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
        connectionFactoryFactory(req, cookieSetter)
        ,req.connection.remoteAddress+':'+req.connection.remotePort.toString()
        ,(msg: IMessage) => {res.sseSend(msg);}
        ,(err: any) => {req.socket.end();}
        ,(err: any, connnection_id: string) => {
            if (err)    // connection cannot be created due to some error
                req.socket.end();   // close the socket, this will trigger req.on("close")
            else {
                conn_id = connnection_id;
                console.log('new client (' + conn_id + ') connected');
            }
        });
        ///////////////////////////////////////////////////////////////////////
		
        // The 'close' event is fired when a user closes their browser window.
        req.on("close", function() {
            if (conn_id.length > 0) {
                console.log('client (' + conn_id + ') closes sse streaming connection');
                connectionsManager.removeConnection(conn_id);
            }
        });
    });
    
    router.post(eventPath + '/subscribe', function(req: express.Request, res: express.Response) {
        let data = req.body;
        let conn_id: string = data.conn_id;
        let sub_id: string = data.sub_id;
        let destination: string = data.destination;
        let headers: {[field: string]: any} = data.headers;
        console.log('client ('+ conn_id +') adding subscription (' + sub_id + ') to destination "' + destination + '"');
        connectionsManager.addSubscription(conn_id, sub_id, destination, headers, (err: any) => {
            if (err) {
                res.jsonp({exception: JSON.parse(JSON.stringify(err))});
            } else {
                res.jsonp({});
            }
        });
    });

    router.get(eventPath + '/unsubscribe', function(req: express.Request, res: express.Response) {
        let query = req.query;
        let conn_id = query.conn_id;
        let sub_id = query.sub_id;
        console.log('client ('+ conn_id +') removing subscription (' + sub_id + ')');
        connectionsManager.removeSubscription(conn_id, sub_id, (err: any) => {
            if (err) {
                res.jsonp({exception: JSON.parse(JSON.stringify(err))});
            } else {
                res.jsonp({});
            }       
        });
    });

    router.post(eventPath + '/send', function(req: express.Request, res: express.Response) {
        let data = req.body;
        connectionsManager.forwardMessage(data.conn_id, data.destination, data.headers, data.body, (err: any) => {
            if (err) {
                res.jsonp({exception: JSON.parse(JSON.stringify(err))});
            } else {
                res.jsonp({});
            }          
        });
    });
    
    return router;
}