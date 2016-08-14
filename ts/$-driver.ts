import {IError, ApiCallOptions} from 'rest-api-interfaces';
import * as eventSource from 'eventsource-typings';

export interface $Driver {
    $J: (method:string, url:string, data:any, done:(err:IError, ret:any) => void, options?: ApiCallOptions) => void;
    $E: (url:string, done:(err: eventSource.Error, eventSource: eventSource.IEventSource) => void, options?:ApiCallOptions) => void;
    $F: (url:string, formData:any, done:(err:IError, ret:any) => void, options?: ApiCallOptions) => void;
}