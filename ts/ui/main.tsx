import * as rcf from 'rcf';
import * as eventSource from 'eventsource-typings';
let EventSource: eventSource.EventSourceConstructor = global['EventSource'];
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {FilesUploadTest} from './FilesUploadTest';

import * as $browser from '../$-browser';
let $driver = $browser.get({EventSource});

let pathname = '/services/events/event_stream';

let api = new rcf.AuthorizedRestApi($driver);
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
        return (
            <div>
                <div>
                    {this.props.message}
                </div>
                <FilesUploadTest />
            </div>
        );
    }
}

client.on('connect', (conn_id:string) => {
    console.log('connected: conn_id=' + conn_id);
    let sub_id = client.subscribe('topic/say_hi'
        ,(msg: rcf.IMessage) => {
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