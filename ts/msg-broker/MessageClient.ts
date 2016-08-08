import {IMessage, IMessageCallback, DoneHandler} from '../common/MessageInterfaces';
import * as events from 'events';
import * as rcf from 'rcf';

export type CommandPath = "/subscribe" | "/unsubscribe" | "/send";

export interface I$J {
    (method: string, cmdPath: CommandPath, data: any, done: rcf.ICompletionHandler): void;
}

export class Subscription extends events.EventEmitter {
    constructor(private $J: I$J, private conn_id: string, public destination: string, public headers:{[field:string]: any}, public sub_id: string, public cb: IMessageCallback) {
        super();
    }
    unsubscribe(done?: DoneHandler) : void {
        MessageClient.ajaxUnsubscribe(this.$J, this.conn_id, this.sub_id, (err: any) => {
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
    private __$E: rcf.I$E = null;
    private __$J: rcf.I$J = null;
    private source: rcf.IEventSource = null;
    private conn_id: string = null;
    public subscriptions: {[sub_id: string]: Subscription;} = {};
    private sub_id: number = 0;
    constructor(EventSourceClass: rcf.EventSourceConstructor, jQuery:any, public url:string, public options?: rcf.ApiCallOptions) {
        super();
        this.__$E = rcf.$Wrapper.get$E(EventSourceClass);
        this.__$J = rcf.$Wrapper.get$J(jQuery);
    }
    
    static ajaxSubscribe($J: I$J, conn_id: string, sub_id: string, destination: string, headers: {[field:string]: any}, done?: DoneHandler) {
        let data = {
            conn_id: conn_id,
            sub_id: sub_id,
            destination: destination,
            headers: headers
        };
        $J("POST", "/subscribe", data, (err, data) => {
            if (typeof done === 'function') done(err ? err : null);
        });
    }
    
    static ajaxUnsubscribe($J: I$J, conn_id:string, sub_id: string, done?: DoneHandler) {
        let data = {
            conn_id: conn_id
            ,sub_id: sub_id
        };
        $J("GET", "/unsubscribe", data, (err, data) => {
            if (typeof done === 'function') done(err ? err : null);
        });
    }
    
    static ajaxSend($J: I$J, conn_id: string, destination: string, headers: { [field: string]: any}, message: any, done?: DoneHandler) {
        let data = {
            conn_id: conn_id,
            destination: destination,
            headers: headers,
            body: message
        };
        $J("POST", "/send", data, (err, data) => {
            if (typeof done === 'function') done(err ? err : null);
        });
    }
		
    connect(cb: (err?: any, conn_id?: string) => void) : void {
        this.__$E(this.url, (err: rcf.EventSourceError, eventSource:rcf.IEventSource) => {
            if (err) {
                if (typeof cb === 'function') cb(err, null);
            } else {
                this.source = eventSource;
                this.source.onopen = () => {
                    this.emit('open');
                };
                this.source.onmessage = (message: rcf.EventSourceMsg) => {
                    let msg: IMessage = JSON.parse(message.data);
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
                this.source.onerror = (err: rcf.EventSourceError) => {
                    if (typeof cb === 'function') cb(err, null);
                };
            }

        }, this.options);
    }

    // this is the $J method for the message client
    private get $J() : I$J {
        return ((method: string, cmdPath: CommandPath, data: any, done: (err: any, data: any) => void) => {
            this.__$J(method, this.url + cmdPath, data, done, this.options);
        });
    }
    
    subscribe(destination: string, cb: IMessageCallback, headers:{[field:string]: any} = {}, done?: DoneHandler) : Subscription {
        if (!this.source || !this.conn_id) throw "not connected";
        let this_sub_id = this.sub_id.toString();
        let subscription = new Subscription(this.$J, this.conn_id, destination, headers, this_sub_id, cb);
        subscription.on('unsubscribed', (sub_id) => {
            delete this.subscriptions[sub_id];
        });
        this.subscriptions[this_sub_id] = subscription;
        this.sub_id++;
        MessageClient.ajaxSubscribe(this.$J, this.conn_id, this_sub_id, destination, headers, (err: any) => {
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
        MessageClient.ajaxSend(this.$J, this.conn_id, destination, headers, message, done);
    }
}