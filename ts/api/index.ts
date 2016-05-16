import {get_router} from '../SSETopicRouter';
import {getTopicConnectionFactory} from '../TopicConnection';

// cookie can be a function of req (example: () => req.access, () => req.user)
  
let router = get_router('/events', getTopicConnectionFactory(5000));
export {router};

router.connectionsManager.on('change', () => {
    console.log("");
    console.log("api router's connectionsManager changed");
    console.log("======================================================");
    console.log(JSON.stringify(router.connectionsManager));
    console.log("======================================================");
    console.log("");
});