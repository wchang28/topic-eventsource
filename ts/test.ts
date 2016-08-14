import * as $node from './$-node';
import * as restIntf from 'rest-api-interfaces';

let $driver = $node.get();

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
// $driver.$J('GET', 'http://127.0.0.1:8080/services/sobject/test_get', data, handler, {headers});
$driver.$J('POST', 'http://127.0.0.1:8080/services/sobject/test_post', data, handler, {headers});