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

        // redirect to clean url
        window.location.replace(window.location.protocol+'//'+window.location.host+window.location.pathname);
        return Promise.reject();
    }

    let token = getCurrentToken();
    if (_.isBlank(token)) return authenticate();
    configureS3(token);

    return Promise.resolve();
}

function authenticate() {
    window.location.replace(`https://${cognito.domain}/login?${queryString.stringify(_.mapKeys(cognito.oauth, (v, k) => _.snakeCase(k)))}`);
    return Promise.reject("Not Authenticated, Redirecting.");
}

function getCurrentToken() {
    let expires = window.localStorage.getItem(TOKEN_EXPIRES_KEY);
    expires = _.parseInt(expires);
    // expires is 60 mins, if 5 mins has elapsed, get creds
    if (_.isNaN(expires) || (expires - 55 * 60 * 1000) < (new Date().getTime())) return;

    let token = window.localStorage.getItem(ID_TOKEN_KEY);
    if (_.isBlank(token)) return;
    return token;
}

function configureS3(token) {
    AWS.config.region = aws.region;
    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
        IdentityPoolId: aws.IdentityPoolId,
        Logins: {
            [`cognito-idp.${cognito.region}.amazonaws.com/${cognito.userPoolId}`]: token
        }
    });
    s3 = new AWS.S3();
}

export let s3;