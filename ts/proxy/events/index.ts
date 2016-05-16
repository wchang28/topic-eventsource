import {getRouter} from '../../SSETopicRouter';
import {getConnectionFactory} from '../../ProxyConnection';

let router = getRouter('/event_stream', getConnectionFactory());
export {router};