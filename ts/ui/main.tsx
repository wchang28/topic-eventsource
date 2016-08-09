import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as rcf from 'rcf';
import * as $ from 'jquery';
import {MessageClient, AuthorizedRestApi} from '../restApi';
import {IMessage} from '../common/MessageInterfaces';
let EventSource: rcf.EventSourceConstructor = global['EventSource'];

//let pathname = '/api/events/event_stream';
let pathname = '/proxy/events/event_stream';

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

let api = new AuthorizedRestApi($, EventSource);
let client = api.$M(pathname, 10000);
client.on('connect', function (conn_id) {
    console.log('connected: conn_id=' + conn_id);
    var sub_id = client.subscribe('topic/say_hi'
        ,(msg) => {
            let message = 'msg-rcvd: ' + JSON.stringify(msg);
            console.log(message);
            ReactDOM.render(<MsgBrokerTestApp message={message}/>, document.getElementById('test'));            
        }
        ,{ "selector": "location = 'USA'" }
        ,(err: any) => {
            console.log('sending a test message...');
            client.send('topic/say_hi', { 'location': 'USA' }, { 'greeting': 'good morining' }, function (err) {
        });
    });
});

client.on('ping', function () {
    let message = '<<PING>> ' + new Date();
    console.log(message);
    ReactDOM.render(<MsgBrokerTestApp message={message}/>, document.getElementById('test'));
});

client.on('error', function (err) {
    let message = '!!! Error:' + JSON.stringify(err);
    console.error(message);
    ReactDOM.render(<MsgBrokerTestApp message={message}/>, document.getElementById('test'));
});

ReactDOM.render(<MsgBrokerTestApp message={'Hello World :-)'}/>, document.getElementById('test'));