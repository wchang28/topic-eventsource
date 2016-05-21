/// <reference path="../../typings/express/express.d.ts" />
/// <reference path="../../typings/express-serve-static-core/express-serve-static-core.d.ts" />
import * as express from 'express';
let router = express.Router();

import {router as topicRouter} from './events';

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
import {ITopicProxy$} from '../ProxyConnection'

interface IAuthorizedProxyRequest extends express.Request {
    $A: IAuthorized$;
    $P: ITopicProxy$;
}

function TopicProxyExtension(req: IAuthorizedProxyRequest, res: express.Response, next: express.NextFunction) {
    let eventSourcePath = '/api/events/event_stream';
    let $P : ITopicProxy$ = {
        $J: (method: string, cmdPath: string, data: any, done: ICompletionHandler) : void => {
            req.$A.$J(method, eventSourcePath + cmdPath, data, done);
        }
        ,$E: (done: ICompletionHandler) : void => {
            req.$A.$E(eventSourcePath, done);
        }
    };
    req.$P = $P;
    next();
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.use('/events', TopicProxyExtension, topicRouter);

topicRouter.connectionsManager.on('change', () => {
    console.log("");
    console.log("proxy topic router's connectionsManager changed");
    console.log("======================================================");
    console.log(JSON.stringify(topicRouter.connectionsManager));
    console.log("======================================================");
    console.log("");
});

export {router};