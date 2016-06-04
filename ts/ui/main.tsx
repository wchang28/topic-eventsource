import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as $ from 'jquery';
var MsgBroker_1 = require('message-broker');
var MessageClient_1 = require('message-client');
require('eventsource-polyfill');

let eventSourceUrl = '/proxy/events/event_stream';

class MsgBrokerTestProps {
    message: string;
}

class MsgBrokerTestApp extends React.Component<MsgBrokerTestProps, any> {
    constructor(props:MsgBrokerTestProps) {
        super(props);
    }
    render() {
        return <div>{this.props.message}</div>;
    }
}

let msgBorker = new MsgBroker_1.MsgBroker(function () { return new MessageClient_1.MessageClient(window.EventSource, $, eventSourceUrl); }, 10000);
msgBorker.on('connect', function (conn_id) {
    console.log('connected: conn_id=' + conn_id);
    var sub_id = msgBorker.subscribe('topic/say_hi'
        ,function(msg) {
            let message = 'msg-rcvd: ' + JSON.stringify(msg);
            console.log(message);
            ReactDOM.render(<MsgBrokerTestApp message={message}/>, document.getElementById('test'));            
        }
        ,{ "selector": "location = 'USA'" }
        ,function (err) {
            console.log('sending a test message...');
            msgBorker.send('topic/say_hi', { 'location': 'USA' }, { 'greeting': 'good morining' }, function (err) {
        });
    });
});
msgBorker.on('client_open', function () {
    console.log('client_open');
});
msgBorker.on('ping', function () {
    let message = '<<PING>> ' + new Date();
    console.log(message);
    ReactDOM.render(<MsgBrokerTestApp message={message}/>, document.getElementById('test'));
});
msgBorker.on('error', function (err) {
    let message = '!!! Error:' + JSON.stringify(err);
    console.error(message);
    ReactDOM.render(<MsgBrokerTestApp message={message}/>, document.getElementById('test'));
});
msgBorker.on('state_changed', function (state) {
    console.log('state_changed: ' + state.toString());
});
msgBorker.connect();

ReactDOM.render(<MsgBrokerTestApp message={'Hello World :-)'}/>, document.getElementById('test'));