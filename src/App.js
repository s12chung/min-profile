import React, {Component} from 'react';
import { Container, Row, Col } from 'react-bootstrap';
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

import Translation from './components/Translation';


class App extends Component {
  constructor(props) {
    super(props);
    this.handleChange = this.handleChange.bind(this);

    this.state = { value: 'Processing', mainTranslation: metadata.mainTranslation };

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

  componentDidMount(){
    document.title = metadata.adminTitle;
  }

  handleChange(change) {
    this.setState({ mainTranslation: Object.assign({}, this.state.mainTranslation, change)}, () => {
      console.log(this.state.mainTranslation);
    });
  }

  render () {
    return (
        <Container>
          <Row>
            <Col><Translation object={this.state.mainTranslation} onChange={this.handleChange}/></Col>
            <Col>{ this.state.value }</Col>
          </Row>
        </Container>
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
