import * as rcf from 'rcf';
import * as $ from 'jquery';
let EventSource: rcf.EventSourceConstructor = global['EventSource'];
import * as React from 'react';
import * as ReactDOM from 'react-dom';

import * as $browser from '../$-browser';
import * as restIntf from 'rest-api-interfaces';

let $driver = $browser.get({jQuery: $, EventSource});

let data:any = {msg:'how are you', name: 'wen', age:5};
let headers:{[fld:string]:string} = {
    'x-my-header': '<<**********wen chang************>>'
};
let handler = (err:restIntf.IError, ret:any) => {
    if (err)
        console.error('!!! Error: ' + JSON.stringify(err));
    else {
        console.log(typeof ret === 'string' ? ret : JSON.stringify(ret));
    }
}
$driver.$J('GET', '/services/sobject/test_get', data, handler, {headers});



let pathname = '/services/events/event_stream';

let api = new rcf.AuthorizedRestApi($, EventSource);
let clientOptions: rcf.IMessageClientOptions = {reconnetIntervalMS: 3000};
let client = api.$M(pathname, clientOptions);

interface MsgBrokerTestProps {
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

client.on('connect', (conn_id:string) => {
    console.log('connected: conn_id=' + conn_id);
    let sub_id = client.subscribe('topic/say_hi'
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

client.on('ping', () => {
    let message = '<<PING>> ' + new Date();
    console.log(message);
    ReactDOM.render(<MsgBrokerTestApp message={message}/>, document.getElementById('test'));
});

client.on('error', (err:any) => {
    let message = '!!! Error:' + JSON.stringify(err);
    console.error(message);
    ReactDOM.render(<MsgBrokerTestApp message={message}/>, document.getElementById('test'));
});

ReactDOM.render(<MsgBrokerTestApp message={'Hello World :-)'}/>, document.getElementById('test'));