/// <reference path="../typings/node/node.d.ts" />
/// <reference path="./Message.ts" />
import {MessageClient as Client} from './MessageClient';
import * as events from 'events';

interface ClientFactory {
    () : Client    
};

export enum MsgBrokerStates {
    Idle,
    Connecting,
    Connected
}

// this class supportes the following events
// 1. state_changed
// 2. client_open
// 3. ping
// 4. connect
// 5. error
export class MsgBroker extends events.EventEmitter {
    private client: Client = null;
    private state: MsgBrokerStates = MsgBrokerStates.Idle;
    private err_not_connected: string = "not connected";
    connect(): void {
        this.client = this.clientFactory();
        this.client.on('open', () => {this.emit('client_open');});
        this.client.on('ping', () => {this.emit('ping');});
        this.state = MsgBrokerStates.Connecting;
        this.emit('state_changed', this.state);
        this.client.connect((err: any, conn_id:string) : void => {
            if (err) {
                this.disconnect();
                setTimeout(() : void => {
                    this.connect();
                }, this.reconnectIntervalMS);
                this.emit('error', err);
            } else {
                this.state = MsgBrokerStates.Connected;
                this.emit('state_changed', this.state);
                this.emit('connect', conn_id);
            }
        });
    }
    constructor(private clientFactory: ClientFactory, private reconnectIntervalMS:number = 5000) {
        super();
    }
    getState() : MsgBrokerStates { return this.state;}
    subscribe(destination: string, cb: IMessageCallback, headers:{[field:string]: any} = {}, done?: DoneHandler) : string {
        if (this.state === MsgBrokerStates.Connected) {
            let subscription = this.client.subscribe(destination, cb, headers, done);
            return subscription.sub_id;
        } else {
            if (typeof done === 'function') done(this.err_not_connected);
            return null;
        }
    }
    send(destination:string, headers: {[field:string]:any}, message:any, done? : DoneHandler) : void {
        if (this.state === MsgBrokerStates.Connected)
            this.client.send(destination, headers, message, done);
        else {
            if (typeof done === 'function') done(this.err_not_connected);
        }
    }
    unsubscribe(sub_id: string, done?: DoneHandler) : void {
        if (this.state === MsgBrokerStates.Connected)
            this.client.subscriptions[sub_id].unsubscribe(done);
        else {
            if (typeof done === 'function') done(this.err_not_connected);
        }
    }
    disconnect(): void {
        if (this.client) {
            this.client.disconnect();
            this.state = MsgBrokerStates.Idle;
            this.client = null;
            this.emit('state_changed', this.state);
        }
    }
}