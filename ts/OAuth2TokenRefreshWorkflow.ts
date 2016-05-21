/// <reference path="../typings/node/node.d.ts" />
import * as events from 'events';

interface ICompletionHandler {
    (err: any, ret: any) : void;
}

interface IAjaxon {
    (method: string, url: string, data:any, done: ICompletionHandler, headers?: any, rejectUnauthorized?:boolean) : void;
}

interface IEventSourceFactory {
    (url: string, eventSourceInitDic: any, done: ICompletionHandler) : void
}

export interface IOAuth2Access {
    instance_url: string;
    token_type?: string;
    access_token?: string;
    refresh_token?: string;
}

export interface IOAuth2TokenRefresher {
    isTokenExpiredError : (err:any) => boolean;
    refreshAccessToken: (refresh_token: string, done: (err: any, newAccess: IOAuth2Access) => void) => void;
}

interface IWorkflowCall {
    call : (url: string, headers:any, done: ICompletionHandler) => void;
}

class AJaxonCall implements IWorkflowCall {
    constructor(protected $J: IAjaxon, protected method: string, protected data: any, protected rejectUnauthorized?:boolean) {}
    call(url: string, headers:any, done: ICompletionHandler) : void {
        this.$J(this.method, url, this.data, done, headers, this.rejectUnauthorized);
    }
}

class EventSourceCall implements IWorkflowCall {
    constructor(protected $E: IEventSourceFactory, protected rejectUnauthorized?:boolean) {}
    call(url: string, headers:any, done: ICompletionHandler) : void {
        let eventSourceInitDic = {headers: headers, rejectUnauthorized: this.rejectUnauthorized};
        this.$E(url, eventSourceInitDic, done);
    }
}

export class OAuth2TokenRefreshWorkflow extends events.EventEmitter {
    constructor(protected $J_: IAjaxon, protected $E_: IEventSourceFactory, protected access: IOAuth2Access, protected tokenRefresher: IOAuth2TokenRefresher, protected rejectUnauthorized?:boolean) {
        super();
    }
    
    private getAuthorizedHeaders(access: IOAuth2Access) : any {
        if (access.token_type && access.access_token)
            return {'Authorization' : access.token_type + " " + access.access_token};
        else
            return {};
    }
    
    private executehWorkflow(workFlowCall: IWorkflowCall, pathname: string, done: ICompletionHandler) {
        workFlowCall.call(this.access.instance_url+pathname, this.getAuthorizedHeaders(this.access), (err: any, ret: any) => {
             if (err) {
                if (this.tokenRefresher && this.tokenRefresher.isTokenExpiredError(err) && this.access.refresh_token) {
                    this.tokenRefresher.refreshAccessToken(this.access.refresh_token, (err: any, newAccess: IOAuth2Access) : void => {
                        if (err)
                            done(err, null);
                        else {
                            this.emit('on_access_refreshed', newAccess);
                            workFlowCall.call(newAccess.instance_url + pathname, this.getAuthorizedHeaders(newAccess), done);
                        }
                    });
                } else
                    done(err, null);
            } else
                done(null, ret);
        });
    }
    
    // workflow's $J method
    $J(method: string, pathname:string, data:any, done: ICompletionHandler) : void {
        let action = new AJaxonCall(this.$J_, method, data, this.rejectUnauthorized);
        this.executehWorkflow(action, pathname, done);
    }
    
    // workflow's $E method
    $E(pathname: string, done: ICompletionHandler) : void {
        let action = new EventSourceCall(this.$E_, this.rejectUnauthorized);
        this.executehWorkflow(action, pathname, done);
    }
}

export class UnAuthorizedWorkflow extends OAuth2TokenRefreshWorkflow {
    constructor($J: IAjaxon, $E: IEventSourceFactory, instance_url: string, rejectUnauthorized?:boolean) {
        let access : IOAuth2Access = {instance_url: instance_url};
        super($J, $E, access, null, rejectUnauthorized);
    }  
}