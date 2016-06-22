import {IAuthorized$} from './Authorized$';
import * as express from 'express';

export interface IAuthorizedRequest extends express.Request {
    $A: IAuthorized$;
}