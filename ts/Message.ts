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
    addSubscription: (sub_id: string, destination: string, headers: {[field: string]: any}, done?: DoneHandler) => void;
    removeSubscription: (sub_id: string, done?: DoneHandler) => void;
    forwardMessage: (srcConn: IConnection, destination: string, headers: {[field: string]: any}, message: any, done?: DoneHandler) => void;
    end: () => void;
    toJSON: () => Object
}

interface IConnectionCreateCompleteHandler {
    (err: any, conn: IConnection) : void;
}

interface IConnectionFactory {
    (conn_id: string, remoteAddress: string, messageCB: IMessageCallback, errorCB: ErrorHandler, done: IConnectionCreateCompleteHandler): void;
}

interface ICookieSetter {
    (req: any) : any;
}

interface IConnectionFactoryFactory {   // a function thats returns connection factory
    (req: any, cookieSetter?: ICookieSetter): IConnectionFactory;
}

interface IEventSourceAjaxon {
    (method: string, path: string, data: any, done: (err: any, data: any) => void): void;
}