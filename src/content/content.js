import {htmlFilePromise} from "../lib/mustache";
import {cssFilePromise} from "../lib/sass";
import {WEBSITE_BUCKET_NAME, BACKUP_BUCKET_NAME, getFiles, reconcileFiles} from "../lib/s3";

import themeHtml from "../theme/main.html";

import configScss from "../theme/config.theme.scss";
import layoutScss from "../theme/layout.theme.scss";
import landingScss from "../theme/landing.theme.scss";
import _ from "lodash";
import marked from "marked";
import JSZip from "jszip";
import {saveAs} from "file-saver";

const MAIN_BACKUP_PREFIX = "current/";
const IMAGE_S3_PREFIX = 'images/';
const SCSS_FILES = [configScss, layoutScss, landingScss];
const LANG_CODE_SEPARATOR = ',';

export function getImageFiles() {
    return getFiles(WEBSITE_BUCKET_NAME, IMAGE_S3_PREFIX);
}

export function download(title, content, setStatus) {
    setStatus("Generating Files", true);
    return generateDeployFiles(content).then((files) => {
        setStatus("Generating Zip", true);
        return generateZip(title, files, content.images);
    }).then(() => {
        setStatus("");
    });
}

export function save(content, setStatus) {
    setStatus("Generating Files", true);
    return generateBackupFiles(content).then((files) => {
        setStatus("Uploading", true);
        return reconcileSave(files, content.images);
    }).then(() => {
        setStatus("Saved!");
    }).catch((e) => {
        console.log("Failure Saving", e);
        setStatus(`Failure Saving: ${e}`);
    });
}

export function deploy(content, setStatus) {
    setStatus("Generating Files", true);
    return generateDeployFiles(content).then((files) => {
        setStatus("Uploading", true);
        return reconcileDeploy(files, content.images);
    }).then(() => {
        setStatus("Deployed!");
    }).catch((e) => {
        console.log("Failure Deploying", e);
        setStatus(`Failure Deploying: ${e}`);
    });
}

function generateBackupFiles(content) {
    content = textContent(content);
    let markdowns = [];
    for (let translation of content.translations) {
        markdowns.push(_.pick(translation, ["lang", "markdown"]));
        delete translation.markdown;
    }

    let files = [new File([window.JSON.stringify(content, null, 2)], "content.json", { type: "application/json" })];
    for (let markdown of markdowns) {
        files.push(new File([markdown.markdown], `${markdown.lang}_markdown.md`, { type: "text/markdown" }))
    }
    return Promise.resolve(files);
}

function textContent(content) {
    return _.cloneDeep(_.omit(content, ["images", "initialImages"]));
}

function generateDeployFiles(content) {
    return Promise.all([
        htmlFilePromise(themeHtml, mustacheVars(content)),
        cssFilePromise(SCSS_FILES)],
    );
}

function generateZip(title, files, images) {
    let zip = new JSZip();
    for (let file of files) {
        zip.file(file.name, file.arrayBuffer());
    }
    for (let file of images) {
        zip.file(IMAGE_S3_PREFIX + file.name, file.arrayBuffer());
    }

    return zip.generateAsync({type:"blob"}).then((blob) => saveAs(blob, `${title}-${(new Date()).toISOString()}.zip`));
}

function reconcileDeploy(files, images) {
    return Promise.all([reconcileFiles(WEBSITE_BUCKET_NAME, files), reconcileFiles(WEBSITE_BUCKET_NAME, images, IMAGE_S3_PREFIX)])
}

function reconcileSave(files, images) {
    return Promise.all([reconcileFiles(BACKUP_BUCKET_NAME, files, MAIN_BACKUP_PREFIX), reconcileFiles(BACKUP_BUCKET_NAME, images, MAIN_BACKUP_PREFIX + IMAGE_S3_PREFIX)])
}

function mustacheVars(content) {
    content = textContent(content);
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