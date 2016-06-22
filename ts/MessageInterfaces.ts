export interface IMsgHeaders {
	event: string;
    conn_id?: string;
    sub_id?: string;
    destination?: string;
}

export interface IMessage {
	headers: IMsgHeaders;
	body?: any;
}

export interface IMessageCallback {
    (msg: IMessage) : void;
}

export interface DoneHandler {
    (err?:any) : void;
}

export interface ErrorHandler {
    (err?:any) : void;
}