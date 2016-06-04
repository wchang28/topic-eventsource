/// <reference path="./Message.ts" />
import {MessageClient as Client} from './MessageClient';
import * as express from 'express';
import * as events from 'events';

class ProxyConnection extends events.EventEmitter implements IConnection {
	public conn_id: string;
	public remoteAddress: string;
	public cookie: any
	private remoteEventSource: any;
	private eventSourceAjaxonFactory: IEventSourceAjaxonFactory
	private state: string;
	private remote_conn_id: string;
		
	constructor(conn_id: string, remoteAddress: string, cookie: any, messageCB: IMessageCallback, errorCB: ErrorHandler, remoteEventSource: any, eventSourceAjaxonFactory: IEventSourceAjaxonFactory) {
		super();
		this.conn_id = conn_id;
		this.remoteAddress = remoteAddress;
		this.cookie = cookie;
		
		this.remoteEventSource = remoteEventSource;
		this.eventSourceAjaxonFactory = eventSourceAjaxonFactory;
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
	addSubscription(req: any, sub_id: string, destination: string, headers: {[field: string]: any}, done?: DoneHandler) : void {
		if (!this.remoteConnected()) {
			if (typeof done === 'function') done("not connected");
		} else {
			Client.ajaxSubscribe(this.eventSourceAjaxonFactory(req), this.remote_conn_id, sub_id, destination, headers, done);
		}
	}
	removeSubscription (req: any, sub_id: string, done?: DoneHandler) : void {
		if (!this.remoteConnected()) {
			if (typeof done === 'function') done("not connected");
		} else {
			Client.ajaxUnsubscribe(this.eventSourceAjaxonFactory(req), this.remote_conn_id, sub_id, done);
		}		
	}
	forwardMessage(req: any, srcConn: IConnection, destination: string, headers: {[field: string]: any}, message: any, done?: DoneHandler) : void {
		if (srcConn === this) {	// only if the message came from this connection
			if (!this.remoteConnected()) {
				if (typeof done === 'function') done("not connected");
			} else {
				Client.ajaxSend(this.eventSourceAjaxonFactory(req), this.remote_conn_id, destination, headers, message, done);
			}
		} else {
			if (typeof done === 'function') done(null);
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

import {IAuthorizedRequest} from './AuthorizedRequest';

export function getConnectionFactory(eventSourcePath: string, cookieSetter?: ICookieSetter)  : IConnectionFactory {
	function eventSourceAjaxonFactory(req: IAuthorizedRequest) : IEventSourceAjaxon {
		return ((method: string, cmdPath: string, data: any, done: ICompletionHandler): void => {
			req.$A.$J(method, eventSourcePath + cmdPath, data, done);
		});
	}
	return ((req: IAuthorizedRequest, conn_id: string, remoteAddress: string, messageCB: IMessageCallback, errorCB: ErrorHandler, done: IConnectionCreateCompleteHandler): void => {
		let cookie = (cookieSetter ? cookieSetter(req) : null);
		req.$A.$E(eventSourcePath, (err: any, eventSource: any): void => {
			if (err) 
				done(err, null);
			else
				done(null, new ProxyConnection(conn_id, remoteAddress, cookie, messageCB, errorCB, eventSource, eventSourceAjaxonFactory));        
		});
	});
}