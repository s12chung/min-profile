import {htmlFilePromise} from "../lib/mustache";
import {cssFilePromise} from "../lib/sass";
import {getFiles, reconcileFiles} from "../lib/s3";

import themeHtml from "../theme/main.html";

import configScss from "../theme/config.theme.scss";
import layoutScss from "../theme/layout.theme.scss";
import landingScss from "../theme/landing.theme.scss";
import _ from "lodash";
import marked from "marked";
import JSZip from "jszip";
import {saveAs} from "file-saver";

const IMAGE_S3_PREFIX = 'images/';
const SCSS_FILES = [configScss, layoutScss, landingScss];
const LANG_CODE_SEPARATOR = ',';

export function generateFiles(content) {
    return Promise.all([
        htmlFilePromise(themeHtml, mustacheVars(content)),
        cssFilePromise(SCSS_FILES)],
    );
}

export function getImageFiles() {
    return getFiles(IMAGE_S3_PREFIX);
}

export function generateZip(title, files, images) {
    let zip = new JSZip();
    for (let file of files) {
        zip.file(file.name, file.arrayBuffer());
    }
    for (let file of images) {
        zip.file(IMAGE_S3_PREFIX + file.name, file.arrayBuffer());
    }

    return zip.generateAsync({type:"blob"}).then((blob) => saveAs(blob, `${title}-${(new Date()).toISOString()}.zip`));
}

export function reconcileWebsite(files, images) {
    return Promise.all([reconcileFiles(files), reconcileFiles(images, IMAGE_S3_PREFIX)])
}

function mustacheVars(content) {
    content = _.cloneDeep(content);
    for (let translation of content.translations) {
        translation.markdownHtml = marked(translation.markdown);
    }
    let allTranslationsMap = _.keyBy(content.translations, 'lang');

    let langCodeToLang = {};
    for (let translation of content.translations) {
        for (let code of translation.codes.split(LANG_CODE_SEPARATOR)) {
            langCodeToLang[code] = translation.lang;
        }
    }

    return {
        backgroundImage: content.shared.backgroundImage,
        languages: content.translations.map((translation) => translation.lang),
        json: {
            langCodeToLang: JSON.stringify(langCodeToLang),
            langCodes: JSON.stringify(_.values(langCodeToLang)),
            translations:  JSON.stringify(allTranslationsMap)
        }
    };
}