import _ from 'lodash';

export function throttledLog(wait) {
    if (_.isBlank(wait)) wait = 5000;
    return _.throttle((o) => console.log(o), wait)
}