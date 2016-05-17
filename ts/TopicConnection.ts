/// <reference path="../typings/node/node.d.ts" />
/// <reference path="./Message.ts" />
import * as events from 'events';
let alasql = require('alasql');

interface Subscription {
	destination: string;
	headers?: {[field: string]: any};
}
class TopicConnection extends events.EventEmitter implements IConnection {
	public conn_id: string;
	public remoteAddress: string
	public cookie: any
	private eventEmitter: events.EventEmitter;
	private subscriptions: {[sub_id:string] : Subscription;}
	private pintInterval: NodeJS.Timer;
	constructor(conn_id: string, remoteAddress: string, cookie: any, messageCB: IMessageCallback, public pingIntervalMS:number = 10000) {
		super();
		this.conn_id = conn_id;
		this.remoteAddress = remoteAddress;
		this.cookie = cookie;
		
		this.eventEmitter = new events.EventEmitter();
		this.eventEmitter.on('message', messageCB);
		this.subscriptions = {};
		if (this.pingIntervalMS > 0) {
			this.pintInterval = setInterval(() => {
				let msg:IMessage = {
					headers: {
						event: "ping"
					}
				};
				this.eventEmitter.emit('message', msg);
			}, this.pingIntervalMS);
		}
		// emit a 'connected' message
		/////////////////////////////////////////////////////////
        let msg : IMessage = {
            headers:
            {
                event: 'connect',
                conn_id: conn_id
            }
	    };
		this.eventEmitter.emit('message', msg);
		/////////////////////////////////////////////////////////
	}
	onChange(handler: () => void) {
		this.on('change', handler);
	}
	forwardMessage(req: any, srcConn: IConnection, destination: string, headers: {[field: string]: any}, message: any, done: DoneHandler) : void {
        for (var sub_id in this.subscriptions) {	// for each subscription this connection has
			let subscription = this.subscriptions[sub_id];
			let pattern = new RegExp(subscription.destination, 'gi');
			if (destination.match(pattern)) {	// matching destination
                let msg: IMessage = {
                   headers: {
                       event: 'msg',
                       sub_id: sub_id,
                       destination: destination
                   },
                   body: message
                };
				if (headers) {
					for (var field in headers) {
						if (!msg.headers[field])
							msg.headers[field] = headers[field];
					}
				}
				if (subscription.headers && subscription.headers['selector'] && typeof subscription.headers['selector'] === 'string' && subscription.headers['selector'].length > 0) {
					let selector: string = subscription.headers['selector'];
					let msgHeaders: any = msg.headers;
					let sql = "select * from ? where " + selector;
					try {
						var res = alasql(sql, [[msgHeaders]]);
						if (res.length > 0) this.eventEmitter.emit('message', msg);
					} catch (e) {
						this.eventEmitter.emit('message', msg);
					}
				} else
					this.eventEmitter.emit('message', msg);
            }
		}
		if (typeof done === 'function') done(null);
	}
	addSubscription(req: any, sub_id: string, destination: string, headers: {[field: string]: any}, done: DoneHandler) : void {
		let subscription: Subscription = {
			destination: destination
			,headers: headers
		};
		this.subscriptions[sub_id] = subscription;
		this.emit('change');
		if (typeof done === 'function') done(null);
	}
	removeSubscription(req: any, sub_id: string, done: DoneHandler) : void {
		delete this.subscriptions[sub_id];
		this.emit('change');
		if (typeof done === 'function') done(null);
	}
	end () : void {
		if (this.pintInterval) {
			clearInterval(this.pintInterval);
			this.pintInterval = null;
			this.subscriptions = {};
			this.emit('change');
		}
	}
	toJSON() : Object {
		let o = {
			conn_id: this.conn_id
			,remoteAddress: this.remoteAddress
			,cookie: this.cookie
			,subscriptions: this.subscriptions
		}
		return o;
	}
}

export function getConnectionFactory(pingIntervalMS:number = 10000, cookieSetter?: ICookieSetter) : IConnectionFactory {
	return ((req:any, conn_id: string, remoteAddress: string, messageCB: IMessageCallback, errorCB: ErrorHandler, done: IConnectionCreateCompleteHandler) => {
		let cookie = (cookieSetter ? cookieSetter(req) : null);
		done(null, new TopicConnection(conn_id, remoteAddress, cookie, messageCB, pingIntervalMS));
	});
}