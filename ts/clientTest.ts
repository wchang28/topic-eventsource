import * as rcf from 'rcf';
let $ = require('jquery-no-dom');
let EventSource: rcf.EventSourceConstructor = require('eventsource');

let connectOptions: rcf.ApiInstanceConnectOptions = {
    instance_url:"http://127.0.0.1:8080"
};

//let pathname = '/api/events/event_stream';
let pathname = '/proxy/events/event_stream';

let api = new rcf.AuthorizedRestApi($, EventSource, rcf.AuthorizedRestApi.connectOptionsToAccess(connectOptions));
let clientOptions: rcf.IMessageClientOptions = {reconnetIntervalMS: 3000};
let client = api.$M(pathname, clientOptions);

client.on('connect', (conn_id:string) => {
    console.log('connected: conn_id=' + conn_id);
    let sub_id = client.subscribe('topic/say_hi', (msg: rcf.IMessage): void => {
        console.log('msg-rcvd: ' + JSON.stringify(msg));
    }, {"selector": "location = 'USA'"}, (err: any): void => {
        if (err) {
            console.error('!!! Error: topic subscription failed');
        } else {
            console.log('topic subscribed sub_id=' + sub_id + " :-)");
            console.log('sending a test message...');
            client.send('topic/say_hi', {'location': 'USA'}, {'greeting':'good afternoon ' + new Date()}, (err: any) : void => {
                if (err) {
                    console.error('!!! Error: message send failed');
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
});

client.on('ping', () => {
    console.log('<<PING>> ' + new Date());
});

client.on('error', (err:any) => {
    console.error('!!! Error: ' + JSON.stringify(err));
});