
import {MsgBroker, MsgBrokerStates} from './MsgBroker';
import {MessageClient} from './MessageClient';
let EventSource = require('eventsource');
let $ = require('jquery-no-dom');

//let url = 'http://127.0.0.1:8080/proxy/events/event_stream';
//let url = 'http://127.0.0.1:8080/api/events/event_stream';
//let eventSourceInitDict = null;

let url = 'https://harvesttesting.firstkeyholdings.com:47380/services/data/v35.0/events/event_stream';
let eventSourceInitDict = {
    headers: {
        'Authorization': 'Bearer' + ' ' + 'Vi7HG3KiptvKF_MYKRSci1qgqNZ8SkF_bKL4RxgSYClN9VWy6nLrXay9lbZqBrjNluuLwRCgXOXRTTgTvUttoqTERGf2ZZbl'
    }
};


let msgBorker = new MsgBroker(() => new MessageClient(EventSource, $, url, eventSourceInitDict) , 10000);

msgBorker.on('connect', (conn_id:string) : void => {
    console.log('connected: conn_id=' + conn_id);
    let sub_id = msgBorker.subscribe('topic/say_hi', {"selector": "location = 'USA'"}, (err: any): void => {
        if (err) {
            console.error('!!! Error: topic subscription failed');
        } else {
            console.log('topic subscribed sub_id=' + sub_id + " :-)");
            console.log('sending a test message...');
            msgBorker.send('topic/say_hi', {'location': 'USA'}, {'greeting':'good afternoon ' + new Date()}, (err: any) : void => {
                if (err) {
                    console.error('!!! Error: message send failed');
                } else {
                    console.log('message sent successfully :-)');
                    /*
                    console.log('unscribing the topic...');
                    msgBorker.unsubscribe(sub_id, (err:any):void => {
                        if (err) {
                            console.error('!!! Error: unscribed failed');
                        } else {
                            console.log('topic unsubscribed :-)'); 
                            msgBorker.disconnect();
                            console.log('disconnected :-)'); 
                        }
                    });
                    */
                }
            });
        }
    });
});

msgBorker.on('client_open', (): void => {
    console.log('client_open');
});

msgBorker.on('ping', (): void => {
    console.log('<<PING>> ' + new Date());
});

msgBorker.on('error', (err: any) : void => {
    console.error('!!! Error:' + JSON.stringify(err));
});

msgBorker.on('message', (msg:IMessage) : void => {
    console.log('msg-rcvd: ' + JSON.stringify(msg));
});

msgBorker.on('state_changed', (state: MsgBrokerStates): void => {
    console.log('state_changed: ' + state.toString());
});

msgBorker.connect();