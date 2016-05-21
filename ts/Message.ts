/// <reference path="../typings/express/express.d.ts" />
/// <reference path="../typings/express-serve-static-core/express-serve-static-core.d.ts" />

interface IMsgHeaders {
	event: string;
    conn_id?: string;
    sub_id?: string;
    destination?: string;
}

interface IMessage {
	headers: IMsgHeaders;
	body?: any;
}

interface IMessageCallback {
    (msg: IMessage) : void;
}

interface DoneHandler {
    (err?:any) : void;
}

interface ErrorHandler {
    (err?:any) : void;
}

interface IConnection {
    conn_id: string
    remoteAddress: string
    cookie: any
    onChange: (handler: () => void) => void;
    addSubscription: (req: any, sub_id: string, destination: string, headers: {[field: string]: any}, done?: DoneHandler) => void;
    removeSubscription: (req: any, sub_id: string, done?: DoneHandler) => void;
    forwardMessage: (req: any, srcConn: IConnection, destination: string, headers: {[field: string]: any}, message: any, done?: DoneHandler) => void;
    end: () => void;
    toJSON: () => Object
}

interface IConnectionCreateCompleteHandler {
    (err: any, conn: IConnection) : void;
}

interface IConnectionFactory {
    (req: any, conn_id: string, remoteAddress: string, messageCB: IMessageCallback, errorCB: ErrorHandler, done: IConnectionCreateCompleteHandler): void;
}

interface ICompletionHandler {
    (err: any, data: any) : void;
}

interface IEventSourceAjaxon {
    (method: string, cmdPath: string, data: any, done: ICompletionHandler): void;
}

interface IEventSourceAjaxonFactory {
    (req: any) : IEventSourceAjaxon;
}

interface IEventSourceFactory {
    (done: ICompletionHandler): void;
}

interface ICookieSetter {
    (req: any) : any;
}