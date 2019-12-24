import React, {Component} from 'react';
import update from 'immutability-helper';
import {Container, Row, Col, Nav } from 'react-bootstrap';
import _ from 'lodash';

import './App.scss';

import Sass from 'sass.js';

import AWS from 'aws-sdk';
import awsConfig from './aws.json'

import Mustache from 'mustache'
import metadata from './metadata.json';

import themeHtml from './theme/main.html'
import layoutScss from './theme/layout.theme.scss'
import configScss from './theme/config.theme.scss'
import landingScss from './theme/landing.theme.scss'

import { throttledLog } from "./lib/log";
import { newTranslation } from "./models/translation";
import Translation from './components/Translation';


const PLUS_LANG = "+";
const tLog = throttledLog();

export const PromptContext = React.createContext({});

class App extends Component {
  constructor(props) {
    super(props);

    this.state = { value: 'Processing', mainTranslation: metadata.mainTranslation, selectedTranslationLang: 'en', translations: metadata.translations };

    return;

    Promise.all([htmlFilePromise(), cssFilePromise()]).then((files) => {
      return files.reduce((a, b) => Object.assign(a, b));
    }).then((files) => {
      this.setState({ value: "Uploading" });
      return uploadFiles(files);
    }).then(() => {
      this.setState({ value: "Success!" });
    }).catch((e) => {
      this.setState({ value: `Failure: ${e}` });
    });
  }

  componentDidMount() {
    document.title = metadata.adminTitle;
  }

  selectedTranslationIndex() {
    return this.state.translations.findIndex((translation) => translation.lang === this.state.selectedTranslationLang);
  }

  handleMainTranslationChange = (change)=> {
    this.setState({ mainTranslation: Object.assign({}, this.state.mainTranslation, change)}, ()=> {
      tLog(this.state.mainTranslation);
    });
  };

  selectTranslation = (lang) => {
    if (lang === PLUS_LANG) {
      lang = this.promptLang();
      if (_.isUndefined(lang)) return;
      this.setState({ translations: update(this.state.translations,{ $push: [newTranslation(lang)] }) })
    }
    this.setState({ selectedTranslationLang: lang });
  };

  promptLang = (lang)=> {
    let allTranslations = [this.state.mainTranslation].concat(this.state.translations);
    lang = window.prompt("Please enter a lang", lang);

    let errorMessage;
    if (_.isUndefined(lang) || _.isEmpty(lang)) errorMessage = 'lang is empty. Aborting';
    for (let translation of allTranslations) {
      if (translation.lang === lang) {
        errorMessage = `lang (${lang}) already exists. Aborting.`;
        break;
      }
    }
    if (!_.isUndefined(errorMessage)) {
      window.alert(errorMessage);
      return;
    }

    return lang;
  };

  handleTranslationChange = (change) => {
    let index = this.selectedTranslationIndex();
    this.setState({ translations: update(this.state.translations, {[index]: { $merge: change }}) }, () => {
      tLog(this.state.translations[index]);
    });
  };

  render () {
    let translation = this.state.translations[this.selectedTranslationIndex()];
    let translations = this.state.translations;
    return (
        <PromptContext.Provider value={{promptLang: this.promptLang}}>
          <Container>
              <Row>
                <Col>
                  <Nav activeKey={this.state.mainTranslation.lang} variant="tabs">
                    <Nav.Item><Nav.Link eventKey={this.state.mainTranslation.lang}>{this.state.mainTranslation.lang}</Nav.Link></Nav.Item>
                  </Nav>
                  <Translation object={this.state.mainTranslation} onChange={this.handleMainTranslationChange}/>
                </Col>
                <Col>
                  <Nav activeKey={this.state.selectedTranslationLang} variant="tabs" onSelect={this.selectTranslation}>
                    {translations.map((t) => <Nav.Item key={t.lang}><Nav.Link eventKey={t.lang}>{t.lang}</Nav.Link></Nav.Item>)}
                    <Nav.Item key={PLUS_LANG}><Nav.Link eventKey={PLUS_LANG}>{PLUS_LANG}</Nav.Link></Nav.Item>
                  </Nav>
                  <Translation object={translation} onChange={this.handleTranslationChange}/>
                </Col>
              </Row>
          </Container>
        </PromptContext.Provider>
  )
  }
}

function htmlFilePromise() {
  return new Promise((resolve) => {
    resolve({ "index.html": { Body: Mustache.render(themeHtml, metadata),  ContentType: "text/html" } })
  });
}

function cssFilePromise() {
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

function uploadFiles(files) {
  AWS.config.update(_.pick(awsConfig, ['accessKeyId', 'secretAccessKey', 'region']));

  let promises = Object.entries(files).map(([filename, props]) =>  {
    return uploadFile(filename, props);
  });
  return Promise.all(promises);
}

function uploadFile(filename, props) {
  return new AWS.S3.ManagedUpload({
    params: Object.assign({ Key: filename }, _.pick(awsConfig, ['Bucket']) , props)
  }).promise();
}

export default App;
