
import {MsgBroker, MsgBrokerStates} from './MsgBroker';
import {MessageClient} from './MessageClient';
let EventSource = require('eventsource');
let $ = require('jquery-no-dom');

//let url = 'http://127.0.0.1:8080/proxy/events';
let url = 'http://127.0.0.1:8080/api/events';

let msgBorker = new MsgBroker(() => new MessageClient(EventSource, $, url) , 10000);

/*
msgBorker.on('connect', (conn_id:string) : void => {
    console.log('connected: conn_id=' + conn_id);
    let sub_id = msgBorker.subscribe('topic/say_hi', {"selector": "location = 'USA'"}, (err: any): void => {
        console.log('sending a test message...');
        msgBorker.send('topic/say_hi', {'location': 'USA'}, {'greeting':'good afternoon'}, (err: any) : void => {
            msgBorker.unsubscribe(sub_id, (err:any):void => {
                //msgBorker.disconnect();
                //console.log('unsubscribed');
            });
        });
    });
});
*/

msgBorker.on('connect', (conn_id:string) : void => {
    console.log('connected: conn_id=' + conn_id);
    console.log('sending a test message...');
    msgBorker.send('topic/say_hi', {'location': 'USA'}, {'greeting':'good morning ' + new Date()}, (err: any) : void => {
        console.log('test message sent disconnecting...');
        msgBorker.disconnect();
        console.log('disconnected');
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