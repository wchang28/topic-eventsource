/// <reference path="../typings/express/express.d.ts" />
/// <reference path="../typings/express-serve-static-core/express-serve-static-core.d.ts" />
/// <reference path="./Message.ts" />
let EventSource = require('eventsource');
import {EventSourceClient as Client} from './EventSourceClient';
import * as express from 'express';
import * as events from 'events';

export class ProxyConnection extends events.EventEmitter implements IConnection {
	public conn_id: string;
	public remoteAddress: string;
	public cookie: any
	private remoteEventSource: any;
	private remoteEventSourceAjaxon: IEventSourceAjaxon
	private state: string;
	private remote_conn_id: string;
		
	constructor(conn_id: string, remoteAddress: string, cookie: any, messageCB: IMessageCallback, errorCB: ErrorHandler, remoteEventSource: any, remoteEventSourceAjaxon: IEventSourceAjaxon) {
		super();
		this.conn_id = conn_id;
		this.remoteAddress = remoteAddress;
		this.cookie = cookie;
		
		this.remoteEventSource = remoteEventSource;
		this.remoteEventSourceAjaxon = remoteEventSourceAjaxon;
		this.state = 'open';
		this.remote_conn_id = "";
		this.initEventSource(messageCB, errorCB);
	}
	private initEventSource(messageCB: IMessageCallback, errorCB: ErrorHandler): void {
		this.remoteEventSource.onmessage = (event) => {
			let msg: IMessage = JSON.parse(event.data);
			if (msg.headers.event === 'connect') {// receive a remote 'connect' message
				this.remote_conn_id = msg.headers.conn_id; // store the remote conn_id
				this.state = 'connected';
				this.emit('change');
				console.log('proxy connected to remote event source. remote_conn_id=' + this.remote_conn_id);
			}
			if (msg.headers.conn_id) msg.headers.conn_id = this.conn_id;	// replace the connection id with this one
			messageCB(msg);
		};
		this.remoteEventSource.onerror = (err) => {
			this.state = 'error';
			this.emit('change');
			errorCB(err);
		};
	}

	remoteConnected() : boolean {
		return (this.state === 'connected');
	}
	end() : void {
		if (this.remoteEventSource) {
			this.remoteEventSource.close();
			this.remoteEventSource = null;
			this.remote_conn_id = "";
			this.state = 'idle';
			this.emit('change');
		}
	}
	onChange(handler: () => void) {
		this.on('change', handler);
	}
	addSubscription(sub_id: string, destination: string, headers: {[field: string]: any}, done?: DoneHandler) : void {
		if (!this.remoteConnected()) {
			if (typeof done === 'funcion') done("not connected");
		} else {
			Client.ajaxSubscribe(this.remoteEventSourceAjaxon, this.remote_conn_id, sub_id, destination, headers, done);
		}
	}
	removeSubscription (sub_id: string, done?: DoneHandler) : void {
		if (!this.remoteConnected()) {
			if (typeof done === 'funcion') done("not connected");
		} else {
			Client.ajaxUnsubscribe(this.remoteEventSourceAjaxon, this.remote_conn_id, sub_id, done);
		}		
	}
	forwardMessage(srcConn: IConnection, destination: string, headers: {[field: string]: any}, message: any, done?: DoneHandler) : void {
		if (srcConn === this) {	// only if the message came from this connection
			if (!this.remoteConnected()) {
				if (typeof done === 'funcion') done("not connected");
			} else {
				Client.ajaxSend(this.remoteEventSourceAjaxon, this.remote_conn_id, destination, headers, message, done);
			}
		} else {
			if (typeof done === 'funcion') done(null);
		}
	}
	toJSON() : Object {
		let o = {
			conn_id: this.conn_id
			,remoteAddress: this.remoteAddress
			,cookie: this.cookie
			,remote_conn_id: this.remote_conn_id
			,state: this.state
		}
		return o;
	}
}