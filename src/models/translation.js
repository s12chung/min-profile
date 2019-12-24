import _ from "lodash";
import metadata from "../metadata";

export function newTranslation(lang) {
    let translation = _.mapValues(metadata.mainTranslation, () => '');
    translation.images = [];
    translation.lang = lang;
    return translation;
}