import * as http from 'http';
import * as request from 'request';

let options: request.Options = {
    url:'http://127.0.0.1:8080/services/sobject/test_get'
    ,method:"GET"
    ,qs: {msg:'how are you', name: 'wen', age:5}
    ,headers: {'x-greeting': 'gretting from wen chang'}
};

//,strictSSL:true/false // rejectUnauthorized

request(options, (error: any, response: http.IncomingMessage, body: any) => {
    console.log('error=' + error? JSON.stringify(error) : 'null');
    console.log(response.headers);
    console.log('statusCode=' + response.statusCode);
    let ret = JSON.stringify(body);
});