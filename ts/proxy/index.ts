import {get_router} from '../SSETopicRouter';
import {getConnectionFactory} from '../ProxyConnection';

let router = get_router('/events', getConnectionFactory());
export {router};

router.connectionsManager.on('change', () => {
    console.log("");
    console.log("proxy router's connectionsManager changed");
    console.log("======================================================");
    console.log(JSON.stringify(router.connectionsManager));
    console.log("======================================================");
    console.log("");
});
