import {getRouter} from '../SSETopicRouter';
import {getConnectionFactory} from '../ProxyConnection';

let router = getRouter('/events', getConnectionFactory());
export {router};