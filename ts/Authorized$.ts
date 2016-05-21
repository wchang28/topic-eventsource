/// <reference path="./Message.ts" />

export interface IAuthorized$ {
	$J: (method: string, pathname: string, data:any, done: ICompletionHandler) => void;
	$E: (pathname: string, done: ICompletionHandler) => void
}
