import _ from 'lodash';

export function throttledLog(wait) {
    if (_.isUndefined(wait)) wait = 1000;
    return _.throttle((o) => console.log(o), wait)
}