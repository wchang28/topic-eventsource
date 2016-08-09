import {IConnection, IConnectionFactory, IConnectionCreateCompleteHandler, IConnectionOptionsBase} from '../MsgConnection';
import * as rcf from 'rcf';
import * as express from 'express';
import * as events from 'events';

// from a express.Request object get an $J function
interface I$JFactory {
    (req: express.Request) : rcf.IMessageClient$J;
}

export interface IAuthorizedApiGetter {
	(req: express.Request) : rcf.IAuthorizedApi;
}

export interface Options extends IConnectionOptionsBase {
	eventSourcePath: string;
	getAuthorizedApi: IAuthorizedApiGetter;
}

class ProxyConnection extends events.EventEmitter implements IConnection {
	public conn_id: string;
	public remoteAddress: string;
	public cookie: any
	private remoteEventSource: rcf.IEventSource;
	private $JFactory: I$JFactory
	private state: string;
	private remote_conn_id: string;
		
	constructor(conn_id: string, remoteAddress: string, cookie: any, messageCB: rcf.IMessageCallback, errorCB: rcf.ErrorHandler, remoteEventSource: rcf.IEventSource, $JFactory: I$JFactory) {
		super();
		this.conn_id = conn_id;
		this.remoteAddress = remoteAddress;
		this.cookie = cookie;
		
		this.remoteEventSource = remoteEventSource;
		this.$JFactory = $JFactory;
		this.state = 'open';
		this.remote_conn_id = "";
		this.initEventSource(messageCB, errorCB);
	}
	private initEventSource(messageCB: rcf.IMessageCallback, errorCB: rcf.ErrorHandler): void {
		this.remoteEventSource.onmessage = (message: rcf.EventSourceMsg) => {
			let msg: rcf.IMessage = JSON.parse(message.data);
			if (msg.headers.event === rcf.MessageEventType.CONNECT) {// receive a remote 'connect' message
				this.remote_conn_id = msg.headers.conn_id; // store the remote conn_id
				this.state = 'connected';
				this.emit('change');
			}
			if (msg.headers.conn_id) msg.headers.conn_id = this.conn_id;	// replace the connection id with this one
			messageCB(msg);
		};
		this.remoteEventSource.onerror = (err: rcf.EventSourceError) => {
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
	addSubscription(req: express.Request, sub_id: string, destination: string, headers: {[field: string]: any}, done?: rcf.DoneHandler) : void {
		if (!this.remoteConnected()) {
			if (typeof done === 'function') done("not connected");
		} else {
			rcf.MessageClient.ajaxSubscribe(this.$JFactory(req), this.remote_conn_id, sub_id, destination, headers, done);
		}
	}
	removeSubscription (req: express.Request, sub_id: string, done?: rcf.DoneHandler) : void {
		if (!this.remoteConnected()) {
			if (typeof done === 'function') done("not connected");
		} else {
			rcf.MessageClient.ajaxUnsubscribe(this.$JFactory(req), this.remote_conn_id, sub_id, done);
		}		
	}
	forwardMessage(req: express.Request, srcConn: IConnection, destination: string, headers: {[field: string]: any}, message: any, done?: rcf.DoneHandler) : void {
		if (srcConn === this && req) {	// only if the message came from this connection
			if (!this.remoteConnected()) {
				if (typeof done === 'function') done("not connected");
			} else {
				rcf.MessageClient.ajaxSend(this.$JFactory(req), this.remote_conn_id, destination, headers, message, done);
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

export function getConnectionFactory(options: Options)  : IConnectionFactory {
	if (!options) throw 'bad options';
	function $JFactory(req: express.Request) : rcf.IMessageClient$J {
		let authorizedApi = (options.getAuthorizedApi)(req);
		return ((method: string, cmdPath: rcf.ClientCommandPath, data: any, done: rcf.ICompletionHandler): void => {
			authorizedApi.$J(method, options.eventSourcePath + cmdPath, data, done);
		});
	}
	return ((req: express.Request, conn_id: string, remoteAddress: string, messageCB: rcf.IMessageCallback, errorCB: rcf.ErrorHandler, done: IConnectionCreateCompleteHandler): void => {
		let cookie = (options.cookieSetter ? (options.cookieSetter)(req) : null);
		let authorizedApi = (options.getAuthorizedApi)(req);
		authorizedApi.$E(options.eventSourcePath, (err: rcf.EventSourceError, eventSource: rcf.IEventSource): void => {
			if (err) 
				done(err, null);
			else
				done(null, new ProxyConnection(conn_id, remoteAddress, cookie, messageCB, errorCB, eventSource, $JFactory));        
		});
	});
}