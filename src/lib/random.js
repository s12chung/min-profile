import _ from 'lodash';

export function randomString(len) {
    if (_.isUndefined(len)) len = 6;
    return Math.random().toString(36).substring(len);
}