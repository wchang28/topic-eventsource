import * as rcf from 'rcf';
import * as $node from 'rest-node';
import * as fs from 'fs';
import * as path from 'path';

let configFile = (process.argv.length < 3 ? path.join(__dirname, '../client_test_config.json') : process.argv[2]);
let connectOptions: rcf.ApiInstanceConnectOptions = JSON.parse(fs.readFileSync(configFile, 'utf8'));

let pathname = '/services/events/event_stream';

let api = new rcf.AuthorizedRestApi($node.get(), rcf.AuthorizedRestApi.connectOptionsToAccess(connectOptions));
let clientOptions: rcf.IMessageClientOptions = {reconnetIntervalMS: 3000};
let client = api.$M(pathname, clientOptions);

client.on('connect', (conn_id:string) => {
    console.log('');
    console.log('connected: conn_id=' + conn_id);
    console.log('');
    //let topic = '/topic/'+conn_id;
    let topic = '/topic/say_hi';
    client.subscribe(topic
    , (msg: rcf.IMessage): void => {
        console.log('msg-rcvd:');
        console.log('===============================================');
        console.log(JSON.stringify(msg, null, 2));
        console.log('===============================================');
    }, {"selector": "location = 'USA'"}
    ).then((sub_id: string) => {
        console.log('topic subscribed sub_id=' + sub_id + " :-)");
        console.log('sending a test message...');  
        return client.send(topic, {'location': 'USA'}, {'greeting':'good afternoon ' + new Date()});     
    }).then((ret: rcf.RESTReturn) => {
        console.log('message sent successfully :-)');
    }).catch((err: any) => {
        console.error('!!! Error: ' + JSON.stringify(err));
    });
}).on('ping', () => {
    console.log('<<PING>> ' + new Date());
}).on('error', (err:any) => {
    console.error('!!! Error: ' + JSON.stringify(err));
});