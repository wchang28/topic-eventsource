export interface ICompletionHandler {
    (err: any, data: any) : void;
}

export interface IEventSourceAjaxon {
    (method: string, cmdPath: string, data: any, done: ICompletionHandler): void;
}