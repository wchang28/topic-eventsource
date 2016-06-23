import {IMessage, IMessageCallback, DoneHandler} from '../common/MessageInterfaces';
import {IEventSourceAjaxon} from '../common/EventSourceAjaxon';
import * as events from 'events';
let Ajx = require("ajaxon");

export class Subscription extends events.EventEmitter {
    constructor(private ajaxon: IEventSourceAjaxon, private conn_id: string, public destination: string, public headers:{[field:string]: any}, public sub_id: string, public cb: IMessageCallback) {
        super();
    }
    unsubscribe(done?: DoneHandler) : void {
        MessageClient.ajaxUnsubscribe(this.ajaxon, this.conn_id, this.sub_id, (err: any) => {
            if (err) {
                if (typeof done === 'function') done(err);
            } else {
                this.emit('unsubscribed',this.sub_id);
                if (typeof done === 'function') done(null);
            }
        });
    }
}

// this class suooprt the following events
// 1. open
// 2. ping
export class MessageClient extends events.EventEmitter {
    private source: any = null;
    private conn_id: string = null;
    public subscriptions: {[sub_id: string]: Subscription;} = {};
    private sub_id: number = 0;
    constructor(private EventSourceClass, private jQuery, public url:string, public eventSourceInitDict?: any) {
        super();
    }
    
    static ajaxSubscribe(ajaxon: IEventSourceAjaxon, conn_id: string, sub_id: string, destination: string, headers: {[field:string]: any}, done?: DoneHandler) {
        let data = {
            conn_id: conn_id,
            sub_id: sub_id,
            destination: destination,
            headers: headers
        };
        ajaxon("POST", "/subscribe", data, (err, data) => {
            if (typeof done === 'function') done(err ? err : null);
        });
    }
    
    static ajaxUnsubscribe(ajaxon: IEventSourceAjaxon, conn_id:string, sub_id: string, done?: DoneHandler) {
        let data = {
            conn_id: conn_id
            ,sub_id: sub_id
        };
        ajaxon("GET", "/unsubscribe", data, (err, data) => {
            if (typeof done === 'function') done(err ? err : null);
        });
    }
    
    static ajaxSend(ajaxon: IEventSourceAjaxon, conn_id: string, destination: string, headers: { [field: string]: any}, message: any, done?: DoneHandler) {
        let data = {
            conn_id: conn_id,
            destination: destination,
            headers: headers,
            body: message
        };
        ajaxon("POST", "/send", data, (err, data) => {
            if (typeof done === 'function') done(err ? err : null);
        });
    }
		
    connect(cb: (err?: any, conn_id?: string) => void) : void {
        this.source = new this.EventSourceClass(this.url, this.eventSourceInitDict);
        this.source.onopen = () => {
            this.emit('open');
        };
        this.source.onmessage = (event) => {
            let msg: IMessage = JSON.parse(event.data);
            //console.log(JSON.stringify(msg));
            if (msg.headers.event === 'ping') {
                this.emit('ping');
            } else if (msg.headers.event === 'connect') {
                this.conn_id = msg.headers.conn_id;
                if (typeof cb === 'function') cb(null, this.conn_id);
            } else if (msg.headers.event === 'msg') {
                let sub_id = msg.headers.sub_id;
                if (this.subscriptions[sub_id] && typeof this.subscriptions[sub_id].cb === 'function') (this.subscriptions[sub_id].cb)(msg);
            }
        };
        this.source.onerror = (err) => {
            if (typeof cb === 'function') cb(err, null);
        };
    }

    private getEventSourceAjaxon() : IEventSourceAjaxon {
        let $J = Ajx(this.jQuery);
        let headers = (this.eventSourceInitDict ? this.eventSourceInitDict.headers : null);
        let rejectUnauthorized = (this.eventSourceInitDict ? this.eventSourceInitDict.rejectUnauthorized : null);
        return ((method: string, cmdPath: string, data: any, done: (err: any, data: any) => void) => {
            $J(method, this.url+cmdPath, data, done, headers, rejectUnauthorized);
        });
    }
    
    subscribe(destination: string, cb: IMessageCallback, headers:{[field:string]: any} = {}, done?: DoneHandler) : Subscription {
        if (!this.source || !this.conn_id) throw "not connected";
        let this_sub_id = this.sub_id.toString();
        let subscription = new Subscription(this.getEventSourceAjaxon(), this.conn_id, destination, headers, this_sub_id, cb);
        subscription.on('unsubscribed', (sub_id) => {
            delete this.subscriptions[sub_id];
        });
        this.subscriptions[this_sub_id] = subscription;
        this.sub_id++;
        MessageClient.ajaxSubscribe(this.getEventSourceAjaxon(), this.conn_id, this_sub_id, destination, headers, (err: any) => {
            if (err) {
                delete this.subscriptions[this_sub_id];
                if (typeof done === 'function') done(err);
            } else {
                if (typeof done === 'function') done(null);
            }
        });
        return subscription;
    }
    disconnect() : void {
        if (this.source) {
            this.source.close();
            this.source = null;
            this.conn_id = null;
            this.subscriptions = {};
            this.sub_id = 0;
        }
    }
    send(destination:string, headers: {[field:string]:any}, message:any, done? : DoneHandler) : void {
        MessageClient.ajaxSend(this.getEventSourceAjaxon(), this.conn_id, destination, headers, message, done);
    }
}