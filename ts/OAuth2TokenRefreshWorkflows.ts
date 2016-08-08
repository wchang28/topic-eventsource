import * as events from 'events';
import * as _ from 'lodash';
import * as rcf from 'rcf';

export interface IOAuth2Access {
    token_type?: string;
    access_token?: string;
    refresh_token?: string;
    instance_url?: string;
    rejectUnauthorized?:boolean;
}

export interface IOAuth2TokenRefresher {
    isTokenExpiredError : (err:any) => boolean;
    refreshAccessToken: (refresh_token: string, done: (err: any, newAccess: IOAuth2Access) => void) => void;
}

interface IWorkflowCall {
    call : (url: string, callOptions: rcf.ApiCallOptions, done: rcf.ICompletionHandler) => void;
}

class AJaxonCall implements IWorkflowCall {
    constructor(protected $J: rcf.I$J, protected method: string, protected data: any) {}
    call(url: string, callOptions: rcf.ApiCallOptions, done: rcf.ICompletionHandler) : void {
        this.$J(this.method, url, this.data, done, callOptions);
    }
}

class EventSourceCall implements IWorkflowCall {
    constructor(protected $E: rcf.I$E) {}
    call(url: string, callOptions: rcf.ApiCallOptions, done: rcf.ICompletionHandler) : void {
        this.$E(url, done, callOptions);
    }
}

export class OAuth2TokenRefreshWorkflow extends events.EventEmitter implements rcf.IAuthorizedApi {
    protected __$J:rcf.I$J = null;
    protected __$E:rcf.I$E = null;
    public additionalHeaders: {[field: string]: string} = null;
    constructor(jQuery: any, EventSourceClass: rcf.EventSourceConstructor, protected access?: IOAuth2Access, protected tokenRefresher?: IOAuth2TokenRefresher) {
        super();
        this.__$J = rcf.$Wrapper.get$J(jQuery);
        this.__$E = rcf.$Wrapper.get$E(EventSourceClass);
    }
    public get instance_url(): string {
        return (this.access ? (this.access.instance_url ? this.access.instance_url : '') : '');
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
        return (this.access ? (typeof this.access.rejectUnauthorized === 'boolean' ? this.access.rejectUnauthorized : null) : null);
    }
    public get callOptions(): rcf.ApiCallOptions {
        let ret: rcf.ApiCallOptions = {};
        if (this.authorizedHeaders) ret.headers = this.authorizedHeaders;
        if (this.rejectUnauthorized) ret.rejectUnauthorized = this.rejectUnauthorized;
        return (JSON.stringify(ret) === '{}' ? null : ret);
    }
    private executehWorkflow(workFlowCall: IWorkflowCall, pathname: string, done: rcf.ICompletionHandler) {
        workFlowCall.call(this.getUrl(pathname), this.callOptions, (err: any, ret: any) => {
             if (err) {
                if (this.tokenRefresher && this.tokenRefresher.isTokenExpiredError(err) && this.access.refresh_token) {
                    this.tokenRefresher.refreshAccessToken(this.access.refresh_token, (err: any, newAccess: IOAuth2Access) : void => {
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
    
    // workflow's $J method
    $J(method: string, pathname:string, data:any, done: rcf.ICompletionHandler) : void {
        let action = new AJaxonCall(this.__$J, method, data);
        this.executehWorkflow(action, pathname, done);
    }
    
    // workflow's $E method
    $E(pathname: string, done: rcf.IEventSourceConnectCompletionHandler) : void {
        let action = new EventSourceCall(this.__$E);
        this.executehWorkflow(action, pathname, done);
    }
}

export class UnAuthorizedWorkflow extends OAuth2TokenRefreshWorkflow {
    constructor(jQuery: any, EventSourceClass: rcf.EventSourceConstructor, options?: rcf.ApiInstanceConnectOptions) {
        let access : IOAuth2Access = {instance_url: options.instance_url, rejectUnauthorized: options.rejectUnauthorized};
        super(jQuery, EventSourceClass, access, null);
    }  
}

export class AuthorizationPassThroughdWorkflow extends OAuth2TokenRefreshWorkflow {
    constructor(jQuery: any, EventSourceClass: rcf.EventSourceConstructor, options?: rcf.ApiInstanceConnectOptions, passThroughHeaders: {[field:string]:string} = null) {
        let access : IOAuth2Access = {instance_url: options.instance_url, rejectUnauthorized: options.rejectUnauthorized};
        super(jQuery, EventSourceClass, access, null);
        this.additionalHeaders = passThroughHeaders;
    }  
}