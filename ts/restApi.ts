import * as events from 'events';
import * as _ from 'lodash';
import * as rcf from 'rcf';
import * as oauth2 from 'oauth2';
import * as mc from './MessageClient';
export {MessageClient, IMessage, IMessageCallback, DoneHandler} from './MessageClient';

export interface IOAuth2TokenRefresher {
    isTokenExpiredError : (err:any) => boolean;
    refreshAccessToken: (refresh_token: string, done: (err: any, newAccess: oauth2.Access) => void) => void;
}

export interface IMessageClient {
    subscribe: (destination: string, cb: mc.IMessageCallback, headers?:{[field:string]: any}, done?: mc.DoneHandler) => string;
    unsubscribe: (sub_id: string, done?: mc.DoneHandler) => void;
    send: (destination:string, headers: {[field:string]:any}, message:any, done? : mc.DoneHandler) => void;
    disconnect: () => void;
    on: (event:string, listener: Function) => this;
}

interface IWorkflowCaller {
    call: (url: string, callOptions: rcf.ApiCallOptions, done: rcf.ICompletionHandler) => void;
}

class $JCaller implements IWorkflowCaller {
    constructor(protected $J: rcf.I$J, protected method: string, protected data: any) {}
    call(url: string, callOptions: rcf.ApiCallOptions, done: rcf.ICompletionHandler) : void {
        this.$J(this.method, url, this.data, done, callOptions);
    }
}

class $ECaller implements IWorkflowCaller {
    constructor(protected $E: rcf.I$E) {}
    call(url: string, callOptions: rcf.ApiCallOptions, done: rcf.ICompletionHandler) : void {
        this.$E(url, done, callOptions);
    }
}

// base class for all REST api
// support the following events:
// 1. on_access_refreshed(newAccess)
export class AuthorizedRestApi extends events.EventEmitter implements rcf.IAuthorizedApi {
    protected __$J:rcf.I$J = null;
    protected __$E:rcf.I$E = null;
    public additionalHeaders: {[field: string]: string} = null;

    static connectOptionsToAccess(connectOptions: rcf.ApiInstanceConnectOptions) : oauth2.Access {
        let access: oauth2.Access = {};
        if (connectOptions && connectOptions.instance_url) access.instance_url = connectOptions.instance_url;
        if (connectOptions && typeof connectOptions.rejectUnauthorized === 'boolean') access.rejectUnauthorized = connectOptions.rejectUnauthorized;
        return (JSON.stringify(access) === '{}' ? null : access);
    }
    constructor(jQuery: any, EventSourceClass: rcf.EventSourceConstructor, protected access?: oauth2.Access, protected tokenRefresher?: IOAuth2TokenRefresher) {
        super();
        this.__$J = rcf.$Wrapper.get$J(jQuery);
        this.__$E = rcf.$Wrapper.get$E(EventSourceClass);
    }
    public get refresh_token() : string {
        return (this.access && this.access.refresh_token ? this.access.refresh_token : null); 
    }
    public get instance_url(): string {
        return (this.access && this.access.instance_url ? this.access.instance_url : '');
    }
    public getUrl(pathname:string) : string {
        return this.instance_url + pathname;
    }
    public get authorizedHeaders() : any {
        let headers = this.additionalHeaders || {};
        if (this.access && this.access.token_type && this.access.access_token)
            _.assignIn(headers, {'Authorization' : this.access.token_type + " " + this.access.access_token});
        return (JSON.stringify(headers) === '{}' ? null : headers);
    }
    public get rejectUnauthorized(): boolean {
        return (this.access && typeof this.access.rejectUnauthorized === 'boolean' ? this.access.rejectUnauthorized : null);
    }
    public get callOptions(): rcf.ApiCallOptions {
        let ret: rcf.ApiCallOptions = {};
        if (this.authorizedHeaders) ret.headers = this.authorizedHeaders;
        if (typeof this.rejectUnauthorized === 'boolean') ret.rejectUnauthorized = this.rejectUnauthorized;
        return (JSON.stringify(ret) === '{}' ? null : ret);
    }
    private executeWorkflow(workFlowCall: IWorkflowCaller, pathname: string, done: rcf.ICompletionHandler) {
        workFlowCall.call(this.getUrl(pathname), this.callOptions, (err: any, ret: any) => {
             if (err) {
                if (this.tokenRefresher && this.tokenRefresher.isTokenExpiredError(err) && this.refresh_token) {
                    this.tokenRefresher.refreshAccessToken(this.refresh_token, (err: any, newAccess: oauth2.Access) : void => {
                        if (err)
                            done(err, null);
                        else {
                            this.emit('on_access_refreshed', newAccess);
                            this.access = newAccess;
                            workFlowCall.call(this.getUrl(pathname), this.callOptions, done);
                        }
                    });
                } else
                    done(err, null);
            } else
                done(null, ret);
        });
    }
    
    // api's $J method
    $J(method: string, pathname:string, data:any, done: rcf.ICompletionHandler) : void {
        let caller = new $JCaller(this.__$J, method, data);
        this.executeWorkflow(caller, pathname, done);
    }
    
    // api's $E method
    $E(pathname: string, done: rcf.IEventSourceConnectCompletionHandler) : void {
        let caller = new $ECaller(this.__$E);
        this.executeWorkflow(caller, pathname, done);
    }

    private getAuthorized$J() : rcf.IAuthorized$J {
        return ((method: string, pathname:string, data:any, done: rcf.ICompletionHandler) => {
            this.$J(method, pathname, data, done);
        });
    }

    // api's $M method
    $M(pathname: string, reconnetIntervalMS: number) : IMessageClient {
        let client = new mc.MessageClient(pathname, this.getAuthorized$J());
        let retryConnect = () => {
            this.$E(pathname, (err:rcf.EventSourceError, eventSource:rcf.IEventSource) => {
                if (err)
                    client.emit('error', err);
                 else
                    client.eventSource = eventSource;
            });               
        };
        client.on('error', (err:any) => {
            setTimeout(retryConnect, reconnetIntervalMS);
        });
        retryConnect();
        return client;
    }
}