import * as $node from 'rest-node';
import * as FormData from 'form-data';
import * as rcf from 'rcf';
import * as fs from 'fs';
import * as path from 'path';

let configFile = (process.argv.length < 3 ? path.join(__dirname, '../client_test_config.json') : process.argv[2]);
let connectOptions: rcf.ApiInstanceConnectOptions = JSON.parse(fs.readFileSync(configFile, 'utf8'));

let $driver = $node.get();
let api = new rcf.AuthorizedRestApi($driver, rcf.AuthorizedRestApi.connectOptionsToAccess(connectOptions));

//let form = new FormData();
let form: FormData = $driver.createFormData();
form.append('FirstName', 'Wen');
form.append('LastName', 'Chang');
form.append("Myfile[]", fs.createReadStream('C:/tmp/signedcorrected 4506-T.pdf'), 'signedcorrected 4506-T.pdf');
form.append("Myfile[]", fs.createReadStream('C:/tmp/polaris.txt'), 'polaris.txt');

api.$F("POST", '/services/upload/file_upload', form)
.then((ret: rcf.RESTReturn) => {
    console.log(JSON.stringify(ret, null, 2));
}).catch((err: any) => {
    console.error("!!! Error: " + JSON.stringify(err));
});

api.$F("POST", '/services/upload/s3_upload', form)
.then((ret: rcf.RESTReturn) => {
    console.log(JSON.stringify(ret, null, 2));
}).catch((err: any) => {
    console.error("!!! Error: " + JSON.stringify(err));
});