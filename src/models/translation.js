import _ from "lodash";
import metadata from "../metadata";

export function newTranslation(lang) {
    let translation = _.mapValues(metadata.translations[0], () => '');
    translation.lang = lang;
    translation.codes = lang;
    return translation;
}