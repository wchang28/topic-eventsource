/// <reference path="../../typings/react/react.d.ts" />
/// <reference path="../../typings/react/react-dom.d.ts" />
import * as React from 'react';
import * as ReactDOM from 'react-dom';

class MsgBrokerTestProps {
}

class MsgBrokerTestApp extends React.Component<MsgBrokerTestProps, any> {
    constructor(props:MsgBrokerTestProps) {
        super(props);
    }
    render() {
        return <div>Hello world!</div>;
    }
}

ReactDOM.render(<MsgBrokerTestApp/>, document.getElementById('test'));