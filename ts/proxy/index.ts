/// <reference path="../../typings/express/express.d.ts" />
/// <reference path="../../typings/express-serve-static-core/express-serve-static-core.d.ts" />
/// <reference path="../Message.ts" />

import {get_router} from '../SSETopicRouter';
import {ProxyConnection} from '../ProxyConnection';

let EventSource = require('eventsource');
let $ = require('jquery-no-dom');
let $J = (require("ajaxon"))($);

function getProxyConnectionFactory(eventSourceUrl: string, eventSourceRejectUnauthorized: boolean = true, cookieSetter?: ICookieSetter)  : IConnectionFactory {
    function eventSourceAjaxonFactory(req: any) : IEventSourceAjaxon {
        return( (method: string, path: string, data: any, done: IAjaxonCompletionHandler) : void => {
            $J(method, eventSourceUrl+path, data, done, {}, eventSourceRejectUnauthorized);
            // or req.$J(method, eventSourceUrl+path, data, done, {}, eventSourceRejectUnauthorized);
        });
    }
    function createConnectedEventSource(url: string, rejectUnauthorized: boolean, done: (err: any, eventSource: any) => void) : void {
        let eventSource = new EventSource(url, {headers: {}, rejectUnauthorized: rejectUnauthorized});
        eventSource.onopen = () : void  => {done(null, eventSource);};
        eventSource.onerror = (err: any) : void => {done(err, null);};
    }
    return ((req: any, conn_id: string, remoteAddress: string, messageCB: IMessageCallback, errorCB: ErrorHandler, done: IConnectionCreateCompleteHandler): void => {
        let cookie = (cookieSetter ? cookieSetter(req) : null);
        createConnectedEventSource(eventSourceUrl, eventSourceRejectUnauthorized, (err: any, eventSource: any): void => {
            if (err) 
                done(err, null);
            else
                done(null, new ProxyConnection(conn_id, remoteAddress, cookie, messageCB, errorCB, eventSource, eventSourceAjaxonFactory));
           
        });
        /* or
        req.createConnectedEventSource(eventSourceUrl, eventSourceRejectUnauthorized, (err: any, eventSource: any) : void => {
            if (err) 
                done(err, null);
            else
                done(null, new ProxyConnection(conn_id, remoteAddress, cookie, messageCB, errorCB, eventSource, eventSourceAjaxonFactory));
        })
        */
    });
}

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
