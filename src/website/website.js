import _ from "lodash";
import marked from "marked";
import JSZip from "jszip";
import {saveAs} from "file-saver";

import path from 'path';

import { readFileAsText } from "../lib/file";
import {renderHTML} from "../lib/mustache";
import {renderCssPromise} from "../lib/sass";
import {
    WEBSITE_BUCKET_NAME,
    BACKUP_BUCKET_NAME,
    getFiles,
    reconcileFiles,
    getFolders,
    deletePath,
    copyPath
} from "../lib/s3";

const CURRENT_PREFIX = "current/";
const BACKUP_PREFIX = "backups/";
const IMAGE_S3_PREFIX = 'images/';
const THEME_S3_PREFIX = 'theme/';
const FAVICON_S3_PREFIX = "favicon/";
const LANG_CODE_SEPARATOR = ',';

const INDEX_FILE_NAME = "index.html";
const INDEX_CSS_FILE_NAME = "index.css";

const CONTENT_FILE_NAME = "content.json";
const MARKDOWN_FILE_EXTENSION = ".md";

const HTML_FILE_EXTENSION = ".html";
const SASS_FILE_EXTENSION = ".scss";

export const DATE_SEPARATOR = "__";

export const EXT_TO_CONTENT_TYPE = {
    ".json": "application/json",
    ".md": "text/markdown",
    ".css": "text/css",
    [HTML_FILE_EXTENSION]: "text/html",
    [SASS_FILE_EXTENSION]: "text/x-scss"
};

export function getContent() {
    return Promise.all([
        getFiles(BACKUP_BUCKET_NAME, CURRENT_PREFIX),
        getFiles(BACKUP_BUCKET_NAME, CURRENT_PREFIX + IMAGE_S3_PREFIX),
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

export function getTheme() {
    return Promise.all([
        getFiles(BACKUP_BUCKET_NAME, CURRENT_PREFIX + THEME_S3_PREFIX),
        getFiles(BACKUP_BUCKET_NAME, CURRENT_PREFIX + FAVICON_S3_PREFIX),
    ]).then(([themeFiles, faviconFiles]) => {
        return Promise.all(themeFiles.map((f) => readFileAsText(f))).then((themeFilesContents) => {
            return {
                faviconFiles: [],
                initialFaviconFiles: faviconFiles,
                files: themeFiles.map((f, i) => ({ name: f.name, content: themeFilesContents[i] })),
            };
        });
    });
}

export function getBackups() {
    return getFolders(BACKUP_BUCKET_NAME, BACKUP_PREFIX).then((folders) => {
        return { folders: _.reverse(
                _.sortBy(folders, (folder) => {
                    let parts = folder.split(DATE_SEPARATOR);
                    return parts[parts.length - 1];
                })
            ) };
    });
}

export function download(title, content, theme, setStatus) {
    setStatus("Generating Files", true);
    return generateDeployFiles(content, theme).then((files) => {
        setStatus("Generating Zip", true);
        return generateZip(title, files, content.images, theme.faviconFiles);
    }).then(() => {
        setStatus("");
    });
}

export function save(content, theme, setStatus) {
    return saveAt(CURRENT_PREFIX, content, theme, setStatus);
}

export function createBackup(name, content, theme, setStatus) {
    if (_.isBlank(name)) name = "empty name";
    name = [name, (new Date()).toJSON()].join(DATE_SEPARATOR);
    return saveAt(BACKUP_PREFIX + name + "/", content, theme, setStatus).then(() => name);
}

export function deleteBackup(name, setStatus) {
    setStatus(`Deleting Backup - ${name}`, true);
    return deletePath(BACKUP_BUCKET_NAME, BACKUP_PREFIX + name + "/")
        .then(() => setStatus("Deleted Backup"))
}

export function restoreBackup(name, setStatus) {
    let fromPrefix = BACKUP_PREFIX + name + "/";
    let toPrefix = CURRENT_PREFIX;

    setStatus(`Restoring Backup - ${name}`, true);
    deletePath(BACKUP_BUCKET_NAME, toPrefix).then(() => {
        setStatus(`Copying Backup - ${name}`, true);
        return copyPath(BACKUP_BUCKET_NAME, fromPrefix, toPrefix);
    }).then(() => {
        setStatus(`Restored!`);
        window.location.reload();
    });
}

function saveAt(prefix, content, theme, setStatus) {
    setStatus("Generating Files", true);
    return generateBackupContentFiles(content).then((files) => {
        setStatus("Uploading", true);
        return reconcileSave(prefix, files, generateBackupThemeFiles(theme), content.images, theme.faviconFiles);
    }).then(() => {
        setStatus("Saved!");
    }).catch((e) => {
        console.log("Failure Saving", e);
        setStatus(`Failure Saving: ${e}`);
    });
}

export function deploy(content, theme, setStatus) {
    setStatus("Generating Files", true);
    return save(content, theme, setStatus).then(() => {
        return generateDeployFiles(content, theme).then((files) => {
            setStatus("Uploading", true);
            return reconcileDeploy(files, content.images, theme.faviconFiles);
        }).then(() => {
            setStatus("Deployed!");
        }).catch((e) => {
            console.log("Failure Deploying", e);
            setStatus(`Failure Deploying: ${e}`);
        });
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
    return theme.files.map((file) => new File([file.content], file.name, { type: EXT_TO_CONTENT_TYPE[path.extname(file.name)] }));
}

function textContent(content) {
    return _.cloneDeep(_.omit(content, ["images", "initialImages"]));
}

function generateDeployFiles(content, theme) {
    return Promise.all([
        htmlFilePromise(_.filter(theme.files, (file) => file.name.endsWith(HTML_FILE_EXTENSION)), mustacheVars(content)),
        cssFilePromise(_.filter(theme.files, (file) => file.name.endsWith(SASS_FILE_EXTENSION)))],
    );
}

function generateZip(title, files, images, faviconFiles) {
    let zip = new JSZip();
    for (let file of files) {
        zip.file(file.name, file.arrayBuffer());
    }
    for (let file of images) {
        zip.file(IMAGE_S3_PREFIX + file.name, file.arrayBuffer());
    }
    for (let file of faviconFiles) {
        zip.file(file.name, file.arrayBuffer());
    }

    return zip.generateAsync({type:"blob"}).then((blob) => saveAs(blob, `${title}-${(new Date()).toISOString()}.zip`));
}

function reconcileSave(prefix, contentFiles, themeFiles, images, faviconFiles) {
    console.log("Starting save");
    return Promise.all([
        reconcileFiles(BACKUP_BUCKET_NAME, contentFiles, prefix),
        reconcileFiles(BACKUP_BUCKET_NAME, images, prefix + IMAGE_S3_PREFIX),
        reconcileFiles(BACKUP_BUCKET_NAME, themeFiles, prefix + THEME_S3_PREFIX),
        reconcileFiles(BACKUP_BUCKET_NAME, faviconFiles, prefix + FAVICON_S3_PREFIX),
    ]);
}

function reconcileDeploy(files, images, faviconFiles) {
    console.log("Starting deploy");
    return Promise.all([
        reconcileFiles(WEBSITE_BUCKET_NAME, _.flatten([files, faviconFiles])),
        reconcileFiles(WEBSITE_BUCKET_NAME, images, IMAGE_S3_PREFIX),
    ]);
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
        return new File([css], INDEX_CSS_FILE_NAME, { type: EXT_TO_CONTENT_TYPE[path.extname(INDEX_CSS_FILE_NAME)] });
    });
}