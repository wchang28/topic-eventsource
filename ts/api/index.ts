import {get_router} from '../SSETopicRouter';
import {getConnectionFactory} from '../TopicConnection';

let router = get_router('/events', getConnectionFactory(5000));
export {router};

router.connectionsManager.on('change', () => {
    console.log("");
    console.log("api router's connectionsManager changed");
    console.log("======================================================");
    console.log(JSON.stringify(router.connectionsManager));
    console.log("======================================================");
    console.log("");
});