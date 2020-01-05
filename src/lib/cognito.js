import AWS from "aws-sdk";
import _ from "lodash";
import queryString from 'querystring';

import aws from "../aws.json"
import cognito from "../cognito.json"

const ID_TOKEN_KEY = "cognito.id_token";
const ACCESS_TOKEN_KEY = "cognito.access_token";
const TOKEN_EXPIRES_KEY = "cognito.expires_at";

export function setCredentials() {
    let hash = _.trimStart(window.location.hash, "#");
    if (!_.isEmpty(hash)) {
        let data = queryString.parse(hash);
        window.localStorage.setItem(ID_TOKEN_KEY, data.id_token);
        window.localStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);
        window.localStorage.setItem(TOKEN_EXPIRES_KEY, ((new Date()).getTime() + parseInt(data.expires_in) * 1000).toString());
        window.location.replace(window.location.protocol+'//'+window.location.host+window.location.pathname);
        return Promise.reject();
    }
    if (!configureS3(window.localStorage.getItem(ID_TOKEN_KEY))) return authenticate();
    return Promise.resolve();
}

function authenticate() {
    window.location.replace(`https://${cognito.domain}/login?${queryString.stringify(_.mapKeys(cognito.oauth, (v, k) => _.snakeCase(k)))}`);
    return Promise.reject("Not Authenticated, Redirecting.");
}

function configureS3(token) {
    if(!_.isString(token) ||_.isEmpty(token)) {
        return false;
    }

    AWS.config.region = aws.region;
    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
        IdentityPoolId: aws.IdentityPoolId,
        Logins: {
            [`cognito-idp.${cognito.region}.amazonaws.com/${cognito.userPoolId}`]: token
        }
    });
    s3 = new AWS.S3();
    return true
}

export let s3;