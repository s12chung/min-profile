import React, {Component} from 'react';
import _ from 'lodash';
import './App.css';

import Sass from 'sass.js';
import AWS from 'aws-sdk';
import awsConfig from './aws.json'

import Mustache from 'mustache'
import themeHtml from './theme/main.html'
import layoutScss from './theme/layout.theme.scss'
import configScss from './theme/config.theme.scss'


class App extends Component {
  constructor(props) {
    super(props);
    this.state = { value: 'Processing' };

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

  render () {
    return (
        <div>{ this.state.value }</div>
    )
  }
}

function htmlFilePromise() {
  let view = {
    title: "My name",
    calc: function () {
      return 20;
    }
  };

  return new Promise((resolve) => {
    resolve({ "index.html": { Body: Mustache.render(themeHtml, view),  ContentType: "text/html" } })
  });
}

function cssFilePromise() {
  return new Promise((resolve, reject) => {
    Sass.compile(configScss + '\n' + layoutScss, function (result) {
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
