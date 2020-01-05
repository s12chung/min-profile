import _ from "lodash";
import awsConfig from "../aws";
import { s3 } from "./cognito";

function baseS3Params() {
    return _.pick(awsConfig, ['Bucket']);
}

function prefixRequest(prefix) {
    let request = { Prefix: prefix };
    if (_.isBlank(prefix)) request = { Delimiter: "/" };
    return request;
}

export function reconcileFiles(files, prefix) {
    if (_.isBlank(prefix)) prefix = '';
    return s3.listObjects(Object.assign(prefixRequest(prefix), baseS3Params())).promise()
        .then(( data) => {
            return data.Contents.reduce((map, object) => {
                if (object.Size === 0) return map; // is directory
                return Object.assign(map, { [object.Key]: object.LastModified })
            }, {});
        })
        .then((keyToLastModified) => {
            let promises = [];

            for (let file of files) {
                let key = prefix + file.name;
                if (!keyToLastModified[key] || file.lastModified !== keyToLastModified[key].getTime()) {
                    console.log(`Uploading object: ${key}`, file);
                    promises.push(uploadFile(key, file));
                } else {
                    console.log(`Skipped uploading object: ${key}`, file);
                }
            }

            let keyToFile = files.reduce((map, file) => Object.assign(map, { [prefix + file.name]: file }), {});
            for (let key of Object.keys(keyToLastModified)) {
                if (!keyToFile[key]) {
                    console.log(`Deleting object: ${key}`);
                    promises.push(s3.deleteObject(Object.assign({ Key: key }, baseS3Params())).promise())
                }
            }
            return Promise.all(promises)
        });
}

function uploadFile(key, file) {
    return s3.upload(Object.assign({ Key: key }, baseS3Params(), { Body: file,  ContentType: file.type })).promise();
}

export function getFiles(prefix) {
    return s3.listObjects(Object.assign(prefixRequest(prefix), baseS3Params())).promise()
        .then((response) => {
            return Promise.all( _.without(response.Contents.map((object) =>{
                if (object.Size === 0) return undefined; // is directory
                return getFile(object.Key)
            }), undefined))
        });
}

function getFile(key) {
    return s3.getObject(Object.assign({Key: key}, baseS3Params())).promise()
        .then((data) => {
            return new File([data.Body], key.split('/').pop(), { type: data.ContentType, lastModified: data.LastModified.getTime() })
        });
}