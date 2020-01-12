import _ from "lodash";

_.mixin({
    'isBlank' : function(v) {
        return (_.isEmpty(v) && !_.isNumber(v)) || _.isNaN(v);
    },
    'isPresent' : function(v) {
        return !_.isBlank(v);
    }
});