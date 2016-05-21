import {getRouter} from '../../SSETopicRouter';
import {getConnectionFactory} from '../../ProxyConnection';

let router = getRouter('/event_stream', getConnectionFactory('/api/events/event_stream'));
export {router};