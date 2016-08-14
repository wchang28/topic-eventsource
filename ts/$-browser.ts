import {IError, ApiCallOptions} from 'rest-api-interfaces';
import * as eventSource from 'eventsource-typings';
import {$Driver} from './$-driver';

export interface Options {
    jQuery:any
    EventSource?: eventSource.EventSourceConstructor
}

export function get(driverOptions: Options) : $Driver {
    let jQueryAjax = (settings:any, done:(err:IError, ret:any) => void) : void => {
        if (!driverOptions || !driverOptions.jQuery) {
            if (typeof done === 'function') done({error:'invalid-jquery', error_description:'jQuery is invalid'}, null);
            return;
        }
        driverOptions.jQuery.ajax(settings)
        .success((ret:any) => {
            if (typeof done === 'function') done(null, ret);
        }).fail((jqXHR:any, textStatus:string, errorThrown:string) => {
            let err = {error: textStatus||errorThrown||'unknown-error', error_description: errorThrown||textStatus||'unknown error occured'};
            if (typeof done === 'function') done(err, null);
        });
    };
    let driver:$Driver  = {
        $J: (method:string, url:string, data:any, done:(err:IError, ret:any) => void, options?: ApiCallOptions) : void => {
            let settings:any = {
                method: method
                ,url: url
                ,dataType: "json"
            };
            if (data) {
                if (method.toLowerCase() != 'get') {
                    settings.contentType = 'application/json; charset=UTF-8';
                    settings.data = typeof data === 'string' ? data : JSON.stringify(data);
                } else
                    settings.data = data;
            }
            if (options && options.headers) settings.headers = options.headers;
            jQueryAjax(settings, done);
        }
        ,$E: (url: string, done: (err: eventSource.Error, eventSource: eventSource.IEventSource) => void, options?:ApiCallOptions) : void => {
            if (!driverOptions || !driverOptions.EventSource) {
                if (typeof done === 'function') done({type:'invalid-EventSource'}, null);
                return;
            }
            let es: eventSource.IEventSource = new (driverOptions.EventSource)(url, options);
            es.onopen = () => {if (typeof done === 'function')  done(null, es);}
            es.onerror = (err: eventSource.Error) => {
                es.close();
                if (typeof done === 'function') done(err, null);
            };
        }
        ,$F: (url:string, formData:any, done:(err:IError, ret:any) => void, options?: ApiCallOptions) : void => {
            let settings:any = {
                method: 'POST'
                ,url: url
                ,contentType: false
                ,processData: false
                ,data: formData
                ,dataType: "json"
            };
            if (options && options.headers) settings.headers = options.headers;
            jQueryAjax(settings, done);
        }
    }
    return driver;
}
