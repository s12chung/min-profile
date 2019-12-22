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


AWS.config.update(_.pick(awsConfig, ['accessKeyId', 'secretAccessKey', 'region']));

class App extends Component {
  constructor(props) {
    super(props);
    this.state = { value: 'Processing' };

    let view = {
      title: "My name",
      calc: function () {
        return 20;
      }
    };

    let files = { "index.html": { Body: Mustache.render(themeHtml, view),  ContentType: "text/html" } };

    new Promise((resolve, reject) => {
      Sass.compile(configScss + '\n' + layoutScss, function (result) {
        console.log("SASS Result");
        console.log(result);
        if (result.status === 0) {
          resolve(result.text)
        }
        reject(new Error(`Failed to compile sass. Status: ${result.status}`));
      });
    }).then((css) => {
      this.setState({ value: "Uploading" });
      files["index.css"] = { Body: css, ContentType: "text/css" }

      let promises = Object.entries(files).map(([filename, props]) =>  {
        return uploadFile(filename, props);
      });
      return Promise.all(promises);
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

function uploadFile(filename, props) {
  return new AWS.S3.ManagedUpload({
    params: Object.assign({ Key: filename }, _.pick(awsConfig, ['Bucket']) , props)
  }).promise();
}

export default App;
