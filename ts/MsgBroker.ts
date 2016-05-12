/// <reference path="../typings/lodash/lodash.d.ts" />

import {Client, Subscription} from './EventSourceClient';

import * as events from 'events';
import * as _ from 'lodash';

interface ClientFactory {
    () : Client    
};

export enum MsgBrokerStates {
    Idle,
    Connecting,
    Connected
}

export class MsgBroker extends events.EventEmitter {
    private client: Client = null;
    private state: MsgBrokerStates = MsgBrokerStates.Idle;
    private err_not_connected: string = "not connected";
    connect(): void {
        this.client = this.clientFactory();
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
    constructor(private clientFactory: ClientFactory, private reconnectIntervalMS:number = 5000, autoConnect: boolean = true) {
        super();
        if (autoConnect) this.connect();
    }
    getState() : MsgBrokerStates { return this.state;}
    subscribe(destination: string, headers:{[field:string]: any} = {}, done?: DoneHandler) : string {
        if (this.state === MsgBrokerStates.Connected) {
            let subscription = this.client.subscribe(destination, (msg:IMessage) => {
                this.emit('message', msg);
            }, headers
            ,done);
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