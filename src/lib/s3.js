import _ from "lodash";
import awsConfig from "../aws";
import { s3 } from "./cognito";

import { readFileAsArrayBuffer } from "./file";

import md5 from 'js-md5'

export const WEBSITE_BUCKET_NAME = "website";
export const BACKUP_BUCKET_NAME = "backup";

export function reconcileFiles(bucketName, files, prefix) {
    if (_.isBlank(prefix)) prefix = '';
    return s3.listObjects(Object.assign(prefixRequest(prefix), baseS3Params(bucketName))).promise()
        .then(( data) => {
            return data.Contents.reduce((map, object) => {
                if (isFolder(object.Key)) return map;
                return Object.assign(map, { [object.Key]: object.ETag })
            }, {});
        })
        .then((keyToMd5) => {
            return Promise.all(files.map((file) => readFileAsArrayBuffer(file))).then((arrayBuffers)=>{
                let promises = [];

                let i = 0;
                for (let file of files) {
                    let key = prefix + file.name;
                    if (!keyToMd5[key] || `"${md5(arrayBuffers[i])}"` !== keyToMd5[key]) {
                        console.log(`Uploading object: ${key}`, file);
                        promises.push(uploadFile(bucketName, key, file));
                    } else {
                        console.log(`Skipped uploading object: ${key}`, file);
                    }
                    i += 1;
                }

                let keyToFile = files.reduce((map, file) => Object.assign(map, { [prefix + file.name]: file }), {});
                for (let key of Object.keys(keyToMd5)) {
                    if (!keyToFile[key]) {
                        console.log(`Deleting object: ${key}`);
                        promises.push(s3.deleteObject(Object.assign({ Key: key }, baseS3Params(bucketName))).promise())
                    }
                }
                if (promises.length === 0) {
                    console.log(`No changes needed for prefix: ${prefix}`)
                }

                return Promise.all(promises)
            });
        });
}

function uploadFile(bucketName, key, file) {
    return s3.upload(Object.assign({ Key: key }, baseS3Params(bucketName), { Body: file,  ContentType: file.type })).promise();
}

export function getFiles(bucketName, prefix) {
    return s3.listObjects(Object.assign(prefixRequest(prefix), baseS3Params(bucketName))).promise()
        .then((response) => {
            return Promise.all(_.without(response.Contents.map((object) => {
                if (isFolder(object.Key)) return undefined;
                return getFile(bucketName, object.Key)
            }), undefined))
        });
}

export function getFolders(bucketName, prefix) {
    return s3.listObjects(Object.assign(prefixRequest(prefix), baseS3Params(bucketName))).promise()
        .then((response) => {
            return response.CommonPrefixes.map((object) => object.Prefix.replace(prefix, "").replace("/", ""));
        });
}

function getFile(bucketName, key) {
    return s3.getObject(Object.assign({Key: key}, baseS3Params(bucketName))).promise()
        .then((data) => {
            return new File([data.Body], key.split('/').pop(), { type: data.ContentType, lastModified: data.LastModified.getTime() })
        });
}

export function deletePath(bucketName, prefix) {
    return s3.listObjects(Object.assign({ Prefix: prefix }, baseS3Params(bucketName))).promise()
        .then((response) => {
            let objects = response.Contents.map((object) => ({ Key: object.Key }));
            return s3.deleteObjects(Object.assign({Delete: { Objects: objects }}, baseS3Params(bucketName))).promise();
        });
}

export function copyPath(bucketName, fromPrefix, toPrefix) {
    let bucket = awsConfig.buckets[bucketName];
    return s3.listObjects(Object.assign({ Prefix: fromPrefix }, baseS3Params(bucketName))).promise()
        .then((response) => {
            return Promise.all(response.Contents.map((object) => {
                let from = object.Key;
                let to = toPrefix + object.Key.replace(fromPrefix, "");
                console.log(`Copying object from ${from} to ${to}`);
                return s3.copyObject({ Bucket: bucket, CopySource: bucket + '/' + from, Key: to }).promise();
            }));
        });
}

function baseS3Params(bucketName) {
    return { Bucket: awsConfig.buckets[bucketName] };
}

function prefixRequest(prefix) {
    return { Prefix: prefix, Delimiter: "/" };
}

function isFolder(key) {
    return key.endsWith("/");
}