import {get_router} from '../SSETopicRouter';
import {ConnectionFactoryFactory} from '../Connection';

// cookie can be a function of req (example: () => req.access, () => req.user)
  
let router = get_router('/events', ConnectionFactoryFactory, (req) => null);
export {router};

router.connectionsManager.on('change', () => {
    console.log("");
    console.log("api router's connectionsManager changed");
    console.log("======================================================");
    console.log(JSON.stringify(router.connectionsManager));
    console.log("======================================================");
    console.log("");
});