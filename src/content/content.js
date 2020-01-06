import _ from "lodash";
import marked from "marked";
import JSZip from "jszip";
import {saveAs} from "file-saver";

import path from 'path';

import {renderHTML} from "../lib/mustache";
import {renderCssPromise} from "../lib/sass";
import {WEBSITE_BUCKET_NAME, BACKUP_BUCKET_NAME, getFiles, reconcileFiles} from "../lib/s3";

const MAIN_BACKUP_PREFIX = "current/";
const IMAGE_S3_PREFIX = 'images/';
const THEME_S3_PREFIX = 'theme/';
const LANG_CODE_SEPARATOR = ',';

const INDEX_FILE_NAME = "index.html";
const INDEX_CSS_FILE_NAME = "index.css";

const CONTENT_FILE_NAME = "content.json";
const MARKDOWN_FILE_EXTENSION = ".md";

const HTML_FILE_EXTENSION = ".html";
const SASS_FILE_EXTENSION = ".scss";

export const EXT_TO_CONTENT_TYPE = {
    ".json": "application/json",
    ".md": "text/markdown",
    ".css": "text/css",
    [HTML_FILE_EXTENSION]: "text/html",
    [SASS_FILE_EXTENSION]: "text/x-scss"
};

export function getContent() {
    return Promise.all([
        getFiles(BACKUP_BUCKET_NAME, MAIN_BACKUP_PREFIX),
        getFiles(BACKUP_BUCKET_NAME, MAIN_BACKUP_PREFIX + IMAGE_S3_PREFIX),
    ]).then(([files, images]) => {
        let contentPromise;
        let markdownPromises = [];
        for (let file of files) {
            if (file.name === CONTENT_FILE_NAME) {
                contentPromise = readFileAsText(file).then((s) => window.JSON.parse(s))
            } else {
                markdownPromises.push(readFileAsText(file).then((s) => ({ lang: path.basename(file.name, MARKDOWN_FILE_EXTENSION), markdown: s })))
            }
        }

        return contentPromise.then((content) => {
            return Promise.all(markdownPromises).then((markdowns) => {
                for (let translation of content.translations) {
                    let markdown = _.find(markdowns, { lang: translation.lang });
                    if (_.isBlank(markdown)) throw new Error(`markdown not found for translation: ${translation.lang}`);
                    translation.markdown = markdown.markdown;
                }
                return content;
            });
        }).then((content) => {
            content.initialImages = images;
            content.images = [];
            return content;
        });
    });
}

export function download(title, content, theme, setStatus) {
    setStatus("Generating Files", true);
    return generateDeployFiles(content, theme).then((files) => {
        setStatus("Generating Zip", true);
        return generateZip(title, files, content.images);
    }).then(() => {
        setStatus("");
    });
}

export function save(content, theme, setStatus) {
    setStatus("Generating Files", true);
    return generateBackupContentFiles(content).then((files) => {
        setStatus("Uploading", true);
        return reconcileSave(files, generateBackupThemeFiles(theme), content.images);
    }).then(() => {
        setStatus("Saved!");
    }).catch((e) => {
        console.log("Failure Saving", e);
        setStatus(`Failure Saving: ${e}`);
    });
}

export function deploy(content, theme, setStatus) {
    setStatus("Generating Files", true);
    return generateDeployFiles(content, theme).then((files) => {
        setStatus("Uploading", true);
        return reconcileDeploy(files, content.images);
    }).then(() => {
        setStatus("Deployed!");
    }).catch((e) => {
        console.log("Failure Deploying", e);
        setStatus(`Failure Deploying: ${e}`);
    });
}

function generateBackupContentFiles(content) {
    content = textContent(content);
    let markdowns = [];
    for (let translation of content.translations) {
        markdowns.push(_.pick(translation, ["lang", "markdown"]));
        delete translation.markdown;
    }

    let files = [new File([window.JSON.stringify(content, null, 2)], CONTENT_FILE_NAME, { type: EXT_TO_CONTENT_TYPE[path.extname(CONTENT_FILE_NAME)] })];
    for (let markdown of markdowns) {
        files.push(new File([markdown.markdown], `${markdown.lang}${MARKDOWN_FILE_EXTENSION}`, { type: EXT_TO_CONTENT_TYPE[MARKDOWN_FILE_EXTENSION] }))
    }

    return Promise.resolve(files);
}

function generateBackupThemeFiles(theme) {
    return theme.files.map((file) => new File([theme.name], file.name, { type: EXT_TO_CONTENT_TYPE[path.extname(file.name)] }));
}

function textContent(content) {
    return _.cloneDeep(_.omit(content, ["images", "initialImages"]));
}

function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsText(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = e => reject(e);
    });
}

function generateDeployFiles(content, theme) {
    return Promise.all([
        htmlFilePromise(_.filter(theme.files, (file) => file.name.endsWith(HTML_FILE_EXTENSION)), mustacheVars(content)),
        cssFilePromise(_.filter(theme.files, (file) => file.name.endsWith(SASS_FILE_EXTENSION)))],
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

function reconcileSave(contentFiles, themeFiles, images) {
    return Promise.all([
        reconcileFiles(BACKUP_BUCKET_NAME, contentFiles, MAIN_BACKUP_PREFIX),
        reconcileFiles(BACKUP_BUCKET_NAME, images, MAIN_BACKUP_PREFIX + IMAGE_S3_PREFIX),
        reconcileFiles(BACKUP_BUCKET_NAME, themeFiles, MAIN_BACKUP_PREFIX + THEME_S3_PREFIX),
    ])
}

function reconcileDeploy(files, images) {
    return Promise.all([reconcileFiles(WEBSITE_BUCKET_NAME, files), reconcileFiles(WEBSITE_BUCKET_NAME, images, IMAGE_S3_PREFIX)])
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

function htmlFilePromise(themeHtmls, vars) {
    return new Promise((resolve) => {
        resolve(new File([renderHTML(themeHtmls[0].content, vars)], INDEX_FILE_NAME, { type: EXT_TO_CONTENT_TYPE[path.extname(INDEX_FILE_NAME)] }))
    });
}

function cssFilePromise(sassFiles) {
    return renderCssPromise(sassFiles).then((css) => {
        return new File([css], INDEX_CSS_FILE_NAME, { type: path.extname(INDEX_CSS_FILE_NAME) });
    });
}