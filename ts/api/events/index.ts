import {getRouter} from '../../SSETopicRouter';
import {getConnectionFactory} from '../../TopicConnection';

let router = getRouter('/event_stream', getConnectionFactory(5000));
export {router};