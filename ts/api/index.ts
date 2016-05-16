import {getRouter} from '../SSETopicRouter';
import {getConnectionFactory} from '../TopicConnection';

let router = getRouter('/events', getConnectionFactory(5000));
export {router};