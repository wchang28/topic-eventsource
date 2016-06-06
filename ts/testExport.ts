
export = function($: any) : (msg: string) => void {
    return ((msg: string) => {
        console.log(msg);
    });
}