import React, {Component} from 'react';
import {Container, Row, Col, Navbar, Nav, ButtonToolbar, Button, FormControl, Form} from 'react-bootstrap';
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

import { reconcileFiles, getFiles } from './lib/s3'
import Translations from "./components/Translations";
import Uploader from './components/Uploader';
import {throttledLog} from "./lib/log";
import {FieldComponentForKey} from "./components/FieldComponent";

const IMAGE_S3_PREFIX = 'images/';

const ADMIN_TITLE = window.location.hostname;
const LANG_CODE_SEPARATOR = ',';
const tLog = throttledLog();

const NAV_HEADERS = ["Content"];
const INPUT_KEYS = ["backgroundImage"];

export const PromptContext = React.createContext({});

class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isLoading: false,
      status: '',
      navIndex: 0,

      backgroundImage: metadata.backgroundImage,
      translations: metadata.translations,
      images: [],
      initialImages: undefined
    };

    getFiles(IMAGE_S3_PREFIX).then((files) => {
      this.setState({ initialImages: files })
    }).catch((e) => {
      console.log("Failure getting images", e);
    });
  }

  setStatus(status, isLoading) {
    this.setState({ status: status, isLoading: !!isLoading });
  }

  generateFiles() {
    this.setStatus("Generating Files", true);
    return Promise.all([htmlFilePromise(this.state.backgroundImage, _.cloneDeep(this.state.translations)), cssFilePromise()]);
  }

  componentDidMount() {
    document.title = ADMIN_TITLE;
  }

  download = () => {
    return this.generateFiles().then((files) => {
      this.setStatus("Generating Zip", true);
      let zip = new JSZip();
      for (let file of files) {
        zip.file(file.name, file.arrayBuffer());
      }
      for (let file of this.state.images) {
        zip.file(IMAGE_S3_PREFIX + file.name, file.arrayBuffer());
      }

      return zip.generateAsync({type:"blob"}).then((blob) => saveAs(blob, `${ADMIN_TITLE}-${(new Date()).toISOString()}.zip`));
    }).then(() => {
      this.setStatus("");
    });
  };

  deploy = () => {
    return this.generateFiles().then((files) => {
      this.setStatus("Uploading", true);
      return Promise.all([reconcileFiles(files), reconcileFiles(this.state.images, IMAGE_S3_PREFIX)]);
    }).then(() => {
      this.setStatus("Deployed!");
    }).catch((e) => {
      console.log("Failure Deploying", e);
      this.setStatus(`Failure Deploying: ${e}`);
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

  handleInputChange = (state) =>{
    this.setState(state);
  };

  content() {
    return (
        <div>
          <Row>
            <Col md={8}>
              <Uploader initialFiles={this.state.initialImages} onChange={this.handleImagesChange} validate={this.validateImage}/>
            </Col>
            <Col>
              <Form>
                {INPUT_KEYS.map((k) => FieldComponentForKey(k, this.state, this.handleInputChange, (id, handleChange, value) => {
                  return <FormControl id={id} value={value} onChange={handleChange} />
                }))}
              </Form>
            </Col>
          </Row>
          <Translations translations={this.state.translations} onChange={this.handleTranslationChange}/>
        </div>
    )
  }

  render () {
    return (
        <Container>
            <Navbar>
              <Navbar.Brand>{ADMIN_TITLE}</Navbar.Brand>
              <Nav className="mr-auto">
                {NAV_HEADERS.map((header) => <Nav.Link key={header} eventKey={header}>{header}</Nav.Link>)}
                <div className="d-flex ml-3">
                  { this.state.isLoading && <div className="lds-facebook"><div></div><div></div><div></div></div>  }
                  <div className="align-self-center">{this.state.status}</div>
                </div>
              </Nav>

              <ButtonToolbar>
                <Button className="m-1" variant="outline-secondary" onClick={this.download}>Download</Button>
                <Button className="m-1" variant="outline-primary">Save</Button>
                <Button className="m-1" onClick={this.deploy}>Deploy</Button>
              </ButtonToolbar>
            </Navbar>
            {this.content()}
        </Container>
  )
  }
}

function htmlFilePromise(backgroundImage, translations) {
  return new Promise((resolve) => {
    for (let translation of translations) {
      translation.markdownHtml = marked(translation.markdown);
    }
    let allTranslationsMap = _.keyBy(translations, 'lang');

    let langCodeToLang = {};
    for (let translation of translations) {
      for (let code of translation.codes.split(LANG_CODE_SEPARATOR)) {
        langCodeToLang[code] = translation.lang;
      }
    }

    let view = {
      backgroundImage: backgroundImage,
      languages: translations.map((translation) => translation.lang),
      json: {
        langCodeToLang: JSON.stringify(langCodeToLang),
        langCodes: JSON.stringify(_.values(langCodeToLang)),
        translations:  JSON.stringify(allTranslationsMap)
      }
    };
    resolve(new File([Mustache.render(themeHtml, view)], "index.html", { type: "text/html" }))
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
    return new File([css], "index.css", { type: "text/css" });
  });
}


export default App;
