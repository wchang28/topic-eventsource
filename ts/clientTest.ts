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
    let topic = '/topic/'+conn_id;
    let sub_id = client.subscribe(topic
    , (msg: rcf.IMessage): void => {
        console.log('msg-rcvd:');
        console.log('===============================================');
        console.log(JSON.stringify(msg, null, 2));
        console.log('===============================================');
    }, {"selector": "location = 'USA'"}, (err: any): void => {
        if (err) {
            console.error('!!! Error: topic subscription failed: ' + JSON.stringify(err));
        } else {
            console.log('topic subscribed sub_id=' + sub_id + " :-)");
            console.log('sending a test message...');
            client.send('/topic/'+conn_id, {'location': 'USA'}, {'greeting':'good afternoon ' + new Date()}, (err: any) : void => {
                if (err) {
                    console.error('!!! Error: message send failed: ' + JSON.stringify(err));
                } else {
                    console.log('message sent successfully :-)');
                    /*
                    setTimeout(() : void => {
                        console.log('unscribing the topic...');
                        client.unsubscribe(sub_id, (err:any):void => {
                            if (err) {
                                console.error('!!! Error: unscribed failed');
                            } else {
                                console.log('topic unsubscribed :-)'); 
                                client.disconnect();
                                console.log('disconnected :-)'); 
                            }
                        });                        
                    }, 10000);
                    */
                }
            });
        }
    });
}).on('ping', () => {
    console.log('<<PING>> ' + new Date());
}).on('error', (err:any) => {
    console.error('!!! Error: ' + JSON.stringify(err));
});