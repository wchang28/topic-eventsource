import * as rcf from 'rcf';
import * as eventSource from 'eventsource-typings';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

import * as $browser from 'rest-browser';
let $driver = $browser.get({});

let api = new rcf.AuthorizedRestApi($driver);

export interface FilesUploadTestProps {
}

export interface FilesUploadTestState {
    uploadToS3?: boolean;
    uploading?: boolean;
}

export class FilesUploadTest extends React.Component<FilesUploadTestProps, FilesUploadTestState> {
    constructor(props:FilesUploadTestProps) {
        super(props);
        this.state = {};
        this.state.uploadToS3 = false;
        this.state.uploading = false;
    }
    /*
    uploadFiles(e:any) {
        let x: any = this.refs["file"];
        //console.log('x = ' + x.toString());
        let files = x.files;
                
        let options:any = {
            url: (this.state.uploadToS3 ? '/services/upload/s3_upload' : '/services/upload/file_upload')
            ,headers: {'x-my-header': '<<**********wen chang************>>'}
        };

        let formData = new FormData();
        formData.append('FirstName', 'Wen');
        formData.append('LastName', 'Chang');
        for (let i = 0; i < files.length; i++) {
            let file = files[i];
            formData.append("Myfile[]", file, file.name);
        }

        ////////////////////////////////////////////////////////////////////////////////////
        let xhr = new XMLHttpRequest();
        xhr.open('POST', options.url, true);
        for (let f in options.headers)
            xhr.setRequestHeader(f, options.headers[f]);
        // Set up a handler for when the request finishes.
        xhr.onload =  () => {
            if (xhr.status === 200) {
                let ret = JSON.parse(xhr.responseText);
                console.log(JSON.stringify(ret));
            } else {
                alert('An error occurred!');
            }
        };
        xhr.send(formData);
        ////////////////////////////////////////////////////////////////////////////////////
        
        e.preventDefault();
    }
    */

    uploadFiles(e:any) {
        let x: any = this.refs["file"];
        //console.log('x = ' + x.toString());
        let files = x.files;
                
        let url = (this.state.uploadToS3 ? '/services/upload/s3_upload' : '/services/upload/file_upload');

        //let formData = new FormData();
        let formData = $driver.createFormData();
        formData.append('FirstName', 'Wen');
        formData.append('LastName', 'Chang');
        for (let i = 0; i < files.length; i++) {
            let file = files[i];
            formData.append("Myfile[]", file, file.name);
        }

        let handler = (err:any, ret:any) => {
            this.setState({uploading: false});
            if (err)
                console.error("!!! Error: " + JSON.stringify(err));
            else
                console.log(typeof ret === 'string'? ret : JSON.stringify(ret));
            alert('done');
        }

        this.setState({uploading: true});
        api.$F(url, formData, handler);
        
        e.preventDefault();
    }

    handleUploadToS3Change(e) {
        this.setState({
            uploadToS3: !this.state.uploadToS3
        });
    } 
    render() {
        return (
            <div>                
                <form encType="multipart/form-data "method="POST" >
                    <div>
                        <input type="checkbox" checked={this.state.uploadToS3} onChange={this.handleUploadToS3Change.bind(this)}/>
                        <label>Upload to S3</label>
                    </div>
                    <div>
                        <input ref="file" type="file" name="file" multiple={true}/>
                        <input type="button" value="Upload" disabled={this.state.uploading} onClick={this.uploadFiles.bind(this)} />
                    </div>
                </form>                
            </div>
        );
    }
}