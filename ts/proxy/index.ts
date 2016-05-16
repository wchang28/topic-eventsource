/// <reference path="../../typings/express/express.d.ts" />
/// <reference path="../../typings/express-serve-static-core/express-serve-static-core.d.ts" />
/// <reference path="../Message.ts" />

import {get_router} from '../SSETopicRouter';
import {ProxyConnection} from '../ProxyConnection';

let EventSource = require('eventsource');
let $ = require('jquery-no-dom');
let $J = (require("ajaxon"))($);

function getProxyConnectionFactory(url: string, rejectUnauthorized: boolean = true, cookieSetter?: ICookieSetter)  : IConnectionFactory {
    return ((req:any, conn_id: string, remoteAddress: string, messageCB: IMessageCallback, errorCB: ErrorHandler, done: (err: any, conn: IConnection) => void): void => {
        let cookie = cookieSetter ? cookieSetter(req) : null;
        let remoteEventSource = new EventSource(url, {headers: {}, rejectUnauthorized: rejectUnauthorized});
        function eventSourceAjaxonFactory(req: any) : IEventSourceAjaxon {
            return( (method: string, path: string, data: any, done: (err: any, data: any) => void) : void => {
                $J(method, url+path, data, done, {}, rejectUnauthorized);
                // or req.$J
            });
        }
        remoteEventSource.onopen = () : void  => {
            done(null, new ProxyConnection(conn_id, remoteAddress, cookie, messageCB, errorCB, remoteEventSource, eventSourceAjaxonFactory)); 
        };
        remoteEventSource.onerror = (err: any) : void => {
            done(err, null); 
        };
    });
}

/*
req.getEventSourceAjaxon = (url: string, rejectUnauthorized: boolean): IEventSourceAjaxon => {
    return( (method: string, path: string, data: any, done: (err: any, data: any) => void) : void => {
        let v = req.access.token_type + ' ' + req.access.access_token;
        $J(method, url+path, data, done, {'Authorization': v}, rejectUnauthorized);
    });
}
req.createConnectedEventSource = (url: string, rejectUnauthorized: boolean, done: (err: any: eventSource: any) => void) : void  => {
    let v = req.access.token_type + ' ' + req.access.access_token;
    let eventSource = new EventSource(url, {headers: {'Authorization': v}, rejectUnauthorized: rejectUnauthorized});
    eventSource.onopen = () : void  => {done(null, eventSource);};
    eventSource.onerror = (err: any) : void => {done(err, null);};
};

function getConnectionFactoryFactory(url: string, rejectUnauthorized: boolean = true)  : IConnectionFactoryFactory {
    return ((req: any, cookieSetter?: ICookieSetter) : IConnectionFactory => {
        let cookie = cookieSetter ? cookieSetter(req) : null;
        return ((conn_id: string, remoteAddress: string, messageCB: IMessageCallback, errorCB: ErrorHandler, done: (err: any, conn: IConnection) => void): void => {
                req.createConnectedEventSource(url, rejectUnauthorized, (err: any, eventSource: any) : void => {
                    if (err) {
                        done(err, null);
                    } else {
                        done(null, new ProxyConnection(conn_id, remoteAddress, cookie, messageCB, errorCB, eventSource, req.getEventSourceAjaxon(url, rejectUnauthorized))); 
                    }
                });
            });
        });
    });
}
*/

//let router = get_router('/events', ConnectionFactoryFactory);
let router = get_router('/events', getProxyConnectionFactory('http://127.0.0.1:8080/api/events', false));

export {router};

router.connectionsManager.on('change', () => {
    console.log("");
    console.log("proxy router's connectionsManager changed");
    console.log("======================================================");
    console.log(JSON.stringify(router.connectionsManager));
    console.log("======================================================");
    console.log("");
});
