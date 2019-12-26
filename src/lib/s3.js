import _ from "lodash";
import awsConfig from "../aws";
import AWS from "aws-sdk";

AWS.config.update(_.pick(awsConfig, ['accessKeyId', 'secretAccessKey', 'region']));
let s3 = new AWS.S3();

function baseS3Params() {
    return _.pick(awsConfig, ['Bucket']);
}

export function uploadFiles(files) {
    let promises = Object.entries(files).map(([filename, props]) =>  {
        return uploadFile(filename, props);
    });
    return Promise.all(promises);
}

function uploadFile(filename, props) {
    return new AWS.S3.ManagedUpload({
        params: Object.assign({ Key: filename }, baseS3Params() , props)
    }).promise();
}

export function getFiles(prefix) {
    return new Promise((resolve, reject)=> {
        s3.listObjects(Object.assign({ Prefix: prefix }, baseS3Params()), (err, data) => {
            if (err) reject(err);
            resolve(Promise.all( _.without(data.Contents.map((object) =>{
                if (object.Size === 0) return undefined;
                return getFile(object.Key)
            }), undefined)));
        });
    });
}

function getFile(key) {
    return new Promise((resolve, reject)=> {
        s3.getObject(Object.assign({Key: key}, baseS3Params()), (err, data) => {
            if (err) reject(err);
            resolve(new File([data.Body], key.split('/').pop(), { type: data.ContentType }));
        });
    });
}