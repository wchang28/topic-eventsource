/// <reference path="../typings/node/node.d.ts" />
import * as events from 'events';

interface IOAuth2Access {
    instance_url: string;
    token_type: string;
    access_token: string;
    refresh_token?: string;
}

interface IOAuth2TokenRefresher {
    isTokenExpiredError : (err:any) => boolean;
    refreshAccessToken: (refresh_token: string, done: (err: any, newAccess: IOAuth2Access) => void) => void;
}

interface IActioCompletionHandler {
    (err: any, data: any) : void;
}

interface IWorkflowAction {
    execute : (url: string, headers:any, done: IActioCompletionHandler) => void;
}

class AJaxonCall implements IWorkflowAction {
    constructor(protected $J: any, protected method: string, protected data: any, protected rejectUnauthorized?:boolean) {}
    execute(url: string, headers:any, done: IActioCompletionHandler) : void {
        this.$J(this.method, url, this.data, done, headers, this.rejectUnauthorized);
    }
}

class EventSourceCall implements IWorkflowAction {
    constructor(protected $E: any, protected rejectUnauthorized?:boolean) {}
    execute(url: string, headers:any, done: IActioCompletionHandler) : void {
        let eventSourceInitDic = {headers: headers, rejectUnauthorized: this.rejectUnauthorized};
        this.$E(url, eventSourceInitDic, done);
    }
}

export class OAuth2TokenRefreshWorkflow extends events.EventEmitter {
    constructor(protected $J_: any, protected $E_: any, protected access: IOAuth2Access, protected tokenRefresher: IOAuth2TokenRefresher) {
        super();
    }
    
    private getAuthorizedHeaders(access: IOAuth2Access) : any {return {'Authorization' : access.token_type + " " + access.access_token};}
    
    private executeTokenRefreshWorkflow(workFlowAction: IWorkflowAction, path: string, done: IActioCompletionHandler) {
        workFlowAction.execute(this.access.instance_url+path, this.getAuthorizedHeaders(this.access), (err: any, ret: any) => {
             if (err) {
                if (this.tokenRefresher.isTokenExpiredError(err) && this.access.refresh_token) {
                    this.tokenRefresher.refreshAccessToken(this.access.refresh_token, (err: any, newAccess: IOAuth2Access) : void => {
                        if (err)
                            done(err, null);
                        else {
                            this.emit('on_access_refreshed', newAccess);
                            workFlowAction.execute(newAccess.instance_url + path, this.getAuthorizedHeaders(newAccess), done);
                        }
                    });
                } else
                    done(err, null);
            } else
                done(null, ret);
        });
    }
    
    $J(method: string, path:string, data:any, done: IActioCompletionHandler, rejectUnauthorized?: boolean) : void {
        let action = new AJaxonCall(this.$J_, method, data, rejectUnauthorized);
        this.executeTokenRefreshWorkflow(action, path, done);
    }
    
    $E(path: string, done: IActioCompletionHandler, rejectUnauthorized?: boolean) : void {
        let action = new EventSourceCall(this.$E_, rejectUnauthorized);
        this.executeTokenRefreshWorkflow(action, path, done);
    }
}