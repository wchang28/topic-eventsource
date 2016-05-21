/// <reference path="../typings/express/express.d.ts" />
/// <reference path="../typings/express-serve-static-core/express-serve-static-core.d.ts" />
/// <reference path="./Message.ts" />
import * as express from 'express';

export interface IAuthorized$ {
	$J: (method: string, pathname: string, data:any, done: ICompletionHandler) => void;
	$E: (pathname: string, done: ICompletionHandler) => void
}

export interface IAuthorizedRequest extends express.Request {
    $A: IAuthorized$;
}
