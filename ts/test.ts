import * as $node from './$-node';
import * as FormData from 'form-data';
import * as fs from 'fs';
import * as rcf from 'rcf';

let connectOptions: rcf.ApiInstanceConnectOptions = {
    instance_url:"http://127.0.0.1:8080"    // proxy
    //instance_url:"http://127.0.0.1:8081"    // direct connect
};

let $driver = $node.get();
let api = new rcf.AuthorizedRestApi($driver, rcf.AuthorizedRestApi.connectOptionsToAccess(connectOptions));

let form = new FormData();
form.append('FirstName', 'Wen');
form.append('LastName', 'Chang');
form.append("Myfile[]", fs.createReadStream('C:/Users/wchang/Desktop/node-grid-4.zip'), 'node-grid-4.zip');
form.append("Myfile[]", fs.createReadStream('C:/Users/wchang/Desktop/signedcorrected 4506-T.pdf'), 'signedcorrected 4506-T.pdf');
form.append("Myfile[]", fs.createReadStream('C:/Users/wchang/Desktop/polaris.txt'), 'polaris.txt');

let handler = (err:any, ret:any) => {
    if (err)
        console.error("!!! Error: " + JSON.stringify(err));
    else
        console.log(typeof ret === 'string'? ret : JSON.stringify(ret));
}

api.$F('/services/upload/file_upload', form, handler);
//api.$F('/services/upload/s3_upload', form, handler);
