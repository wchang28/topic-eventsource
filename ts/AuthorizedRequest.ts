/// <reference path="../typings/express/express.d.ts" />
/// <reference path="../typings/express-serve-static-core/express-serve-static-core.d.ts" />
import {IAuthorized$} from './Authorized$';
import * as express from 'express';

export interface IAuthorizedRequest extends express.Request {
    $A: IAuthorized$;
}