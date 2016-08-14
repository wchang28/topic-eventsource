import * as $node from './$-node';
import * as restIntf from 'rest-api-interfaces';

let $driver = $node.get()
let headers:{[fld:string]:string} = {
    'x-my-header': '<<**********wen chang************>>'
};

/*
$driver.$J('GET', 'http://127.0.0.1:8080/services/sobject/test_get', {msg:'how are you', name: 'wen', age:5}, (err:$lib.IError, ret:any) => {
    if (err)
        console.error('!!! Error: ' + JSON.stringify(err));
    else {
        console.log(typeof ret === 'string' ? ret : JSON.stringify(ret));
    }
}, {headers});
*/

$driver.$J('POST', 'http://127.0.0.1:8080/services/sobject/test_post', {msg:'how are you', name: 'wen', age:5}, (err:restIntf.IError, ret:any) => {
    if (err)
        console.error('!!! Error: ' + JSON.stringify(err));
    else {
        console.log(typeof ret === 'string' ? ret : JSON.stringify(ret));
    }
}, {headers});