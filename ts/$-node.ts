import {IError, ApiCallOptions} from 'rest-api-interfaces';
import * as eventSource from 'eventsource-typings';
import {$Driver} from './$-driver';
import * as http from 'http';
import * as request from 'request';
import * as _ from 'lodash';
import * as FormData from 'form-data';

let getHandler = (done:(err:IError, ret:any) => void) : request.RequestCallback => {
    let handler = (error: any, response: http.IncomingMessage, body: any) => {
        let err:IError = null;
        let ret:any = null;
        if (error) {
            err = {error: error.code||error.errno||'unknown-error', error_description: error.errno||error.code||'unknown error occured'};
        } else {
            if (response) {
                if (response.statusCode >= 400) {
                    err = {error: response.statusMessage, error_description:body};
                } else {
                    if (body) {
                        if (typeof body === 'string') {
                            try {
                                ret = JSON.parse(body);
                            } catch(e) {
                                ret = body;
                            }
                        } else
                            ret = body;       
                    }
                }
            } else {
                err = {error: 'unknown-error', error_description: 'unknown error occured'};
            }
        }
        if (typeof done === 'function') done(err, ret);
    }
    return handler;
}

export function get() : $Driver {
    let driver:$Driver  = {
        $J: (method:string, url:string, data:any, done:(err:IError, ret:any) => void, options?: ApiCallOptions) : void => {
            let opt: request.Options = {
                url:url
                ,method:method
                ,headers: {}
            };
            if (data) {
                if (method.toLowerCase() === 'get')
                    opt.qs = data;
                else
                    opt.json = data;
            }
            if (options && options.headers) opt.headers = _.assignIn(opt.headers, options.headers);
            if (options && typeof options.rejectUnauthorized === 'boolean') opt.strictSSL = options.rejectUnauthorized;
            request(opt, getHandler(done));
        }
        ,$E: (url: string, done: (err: eventSource.Error, eventSource: eventSource.IEventSource) => void, options?:ApiCallOptions) : void => {
            let EventSource: eventSource.EventSourceConstructor = require('eventsource');
            let es: eventSource.IEventSource = new EventSource(url, options);
            es.onopen = () => {if (typeof done === 'function')  done(null, es);}
            es.onerror = (err: eventSource.Error) => {
                es.close();
                if (typeof done === 'function') done(err, null);
            };
        }
        ,$F: (url:string, formData:any, done:(err:IError, ret:any) => void, options?: ApiCallOptions) : void => {
            let fd:FormData = formData;
            let opt: request.Options = {
                url:url
                ,method:'POST'
                ,headers: {}
            };
            if (options && options.headers) opt.headers = _.assignIn(opt.headers, options.headers);
            if (options && typeof options.rejectUnauthorized === 'boolean') opt.strictSSL = options.rejectUnauthorized;
            opt.headers = _.assignIn(opt.headers, fd.getHeaders());
            fd.pipe(request.post(opt, getHandler(done)));
        }
    }
    return driver;
}