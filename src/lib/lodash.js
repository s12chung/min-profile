import _ from "lodash";

_.mixin({
    'isBlank' : function(v) {
        return _.isUndefined(v) ||_.isEmpty(v);
    },
    'isPresent' : function(v) {
        return !_.isBlank(v);
    }
});