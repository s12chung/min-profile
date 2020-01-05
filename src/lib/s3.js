import _ from "lodash";
import awsConfig from "../aws";
import { s3 } from "./cognito";

export const WEBSITE_BUCKET_NAME = "website";
export const BACKUP_BUCKET_NAME = "backup";

export function reconcileFiles(bucketName, files, prefix) {
    if (_.isBlank(prefix)) prefix = '';
    return s3.listObjects(Object.assign(prefixRequest(prefix), baseS3Params(bucketName))).promise()
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
                    promises.push(uploadFile(bucketName, key, file));
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

function uploadFile(bucketName, key, file) {
    return s3.upload(Object.assign({ Key: key }, baseS3Params(bucketName), { Body: file,  ContentType: file.type })).promise();
}

export function getFiles(bucketName, prefix) {
    return s3.listObjects(Object.assign(prefixRequest(prefix), baseS3Params(bucketName))).promise()
        .then((response) => {
            return Promise.all( _.without(response.Contents.map((object) =>{
                if (object.Size === 0) return undefined; // is directory
                return getFile(bucketName, object.Key)
            }), undefined))
        });
}

function getFile(bucketName, key) {
    return s3.getObject(Object.assign({Key: key}, baseS3Params(bucketName))).promise()
        .then((data) => {
            return new File([data.Body], key.split('/').pop(), { type: data.ContentType, lastModified: data.LastModified.getTime() })
        });
}

function baseS3Params(bucketName) {
    return { Bucket: awsConfig.buckets[bucketName] };
}

function prefixRequest(prefix) {
    let request = { Prefix: prefix };
    if (_.isBlank(prefix)) request = { Delimiter: "/" };
    return request;
}