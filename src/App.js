import React, {Component} from 'react';
import {Container, Row, Col, Navbar, Nav, ButtonToolbar, Button} from 'react-bootstrap';
import marked from 'marked';
import update from 'immutability-helper';
import _ from 'lodash';

import 'react-dropzone-uploader/dist/styles.css'

import Sass from 'sass.js';
import Mustache from 'mustache'
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import metadata from './metadata.json';

import themeHtml from './theme/main.html'
import layoutScss from './theme/layout.theme.scss'
import configScss from './theme/config.theme.scss'
import landingScss from './theme/landing.theme.scss'

import { uploadFiles, getFiles } from './lib/s3'
import Translations from "./components/Translations";
import Uploader from './components/Uploader';
import {throttledLog} from "./lib/log";

const LANG_CODE_SEPARATOR = ',';
const tLog = throttledLog();

const NAV_HEADERS = ["Content"];

export const PromptContext = React.createContext({});

class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      value: 'Processing',
      navIndex: 0,
      translations: metadata.translations,
      images: [],
      initialImages: undefined
    };

    getFiles('images/').then((files) => {
      this.setState({ initialImages: files })
    }).catch((e) => {
      console.log("Failure getting images", e);
    });

    this.generateFiles().then((files) => {
      this.setState({ value: "Uploading" });
      return uploadFiles(files);
    }).then(() => {
      this.setState({ value: "Success!" });
    }).catch((e) => {
      this.setState({ value: `Failure Uploading: ${e}` });
    });
  }

  generateFiles() {
    for (let translation of this.state.translations) {
      translation.markdownHtml = marked(translation.markdown);
    }
    let allTranslationsMap = _.keyBy(this.state.translations, 'lang');

    let langCodeToLang = {};
    for (let translation of this.state.translations) {
      for (let code of translation.codes.split(LANG_CODE_SEPARATOR)) {
        langCodeToLang[code] = translation.lang;
      }
    }

    let view = {
      languages: this.state.translations.map((translation) => translation.lang),
      currentTranslation: allTranslationsMap[this.state.translations[0]],
      json: {
        langCodeToLang: JSON.stringify(langCodeToLang),
        langCodes: JSON.stringify(_.values(langCodeToLang)),
        translations:  JSON.stringify(allTranslationsMap)
      }
    };

    return Promise.all([htmlFilePromise(view), cssFilePromise()]).then((files) => {
      return files.reduce((a, b) => Object.assign(a, b));
    });
  }

  componentDidMount() {
    document.title = metadata.adminTitle;
  }

  download = () => {
    return this.generateFiles().then((files) => {
      let zip = new JSZip();
      Object.entries(files).forEach(([filename, props]) =>  {
        zip.file(filename, props.Body);
      });
      for (let file of this.state.images) {
        zip.file(`images/${file.name}`, file.arrayBuffer());
      }

      return zip.generateAsync({type:"blob"}).then((blob) => saveAs(blob, `admin-${(new Date()).toISOString()}.zip`));
    });
  };

  validateImage = (file) => {
    if (_.findIndex(this.state.images, (existing) => existing.name === file.name) === -1) return false;
    return 'duplicate file name detected';
  };

  handleImagesChange = (operation, file) => {
    this.setState({ images: update(this.state.images, this.operationToImageSpec(operation, file)) } );
  };

  operationToImageSpec(operation, file) {
    switch(operation) {
      case 'add': return {$push: [file]};
      case 'remove': return {$splice: [[this.state.images.indexOf(file), 1]]};
      default: return;
    }
  }

  handleTranslationChange = (index, translationsUpdate, callback) => {
    this.setState({ translations: translationsUpdate }, () => {
      tLog(this.state.translations[index]);
      if (callback) callback();
    });
  };

  render () {
    return (
          <Container>
              <Navbar>
                <Navbar.Brand>{metadata.adminTitle}</Navbar.Brand>
                <Nav className="mr-auto">
                  {NAV_HEADERS.map((header) => <Nav.Link key={header} eventKey={header}>{header}</Nav.Link>)}
                </Nav>

                <ButtonToolbar>
                  <Button className="m-1" variant="outline-secondary" onClick={this.download}>Download</Button>
                  <Button className="m-1" variant="outline-primary">Save</Button>
                  <Button className="m-1" >Deploy</Button>
                </ButtonToolbar>
              </Navbar>
              <Row>
                <Col>
                  {this.state.value}
                  <Uploader initialFiles={this.state.initialImages} onChange={this.handleImagesChange} validate={this.validateImage}/>
                </Col>
              </Row>
              <Translations translations={this.state.translations} onChange={this.handleTranslationChange}/>
          </Container>
  )
  }
}

function htmlFilePromise(view) {
  return new Promise((resolve) => {
    resolve({ "index.html": { Body: Mustache.render(themeHtml, view),  ContentType: "text/html" } })
  });
}

export function cssFilePromise() {
  let scssFiles = [configScss, layoutScss, landingScss];
  return new Promise((resolve, reject) => {
    Sass.compile(scssFiles.join("\n"), function (result) {
      console.log("SASS Result");
      console.log(result);
      if (result.status === 0) {
        resolve(result.text)
      }
      reject(new Error(`Failed to compile sass. Status: ${result.status}`));
    });
  }).then((css) => {
    return { "index.css": { Body: css, ContentType: "text/css" } };
  });
}


export default App;
