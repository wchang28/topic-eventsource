import * as express from 'express';
import * as mc from '../MessageClient';

export interface IConnection {
    conn_id: string
    remoteAddress: string
    cookie: any
    onChange: (handler: () => void) => void;
    addSubscription: (req: express.Request, sub_id: string, destination: string, headers: {[field: string]: any}, done?: mc.DoneHandler) => void;
    removeSubscription: (req: express.Request, sub_id: string, done?: mc.DoneHandler) => void;
    forwardMessage: (req: express.Request, srcConn: IConnection, destination: string, headers: {[field: string]: any}, message: any, done?: mc.DoneHandler) => void;
    end: () => void;
    toJSON: () => Object
}

export interface IConnectionCreateCompleteHandler {
    (err: any, conn: IConnection) : void;
}

export interface IConnectionFactory {
    (req: express.Request, conn_id: string, remoteAddress: string, messageCB: mc.IMessageCallback, errorCB: mc.ErrorHandler, done: IConnectionCreateCompleteHandler): void;
}

export interface ICookieSetter {
    (req: express.Request) : any;
}

export interface IConnectionOptionsBase {
    cookieSetter?:ICookieSetter;
}