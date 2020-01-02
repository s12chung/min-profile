import React, {Component} from 'react';
import {Container} from 'react-bootstrap';
import update from 'immutability-helper';
import _ from 'lodash';

import metadata from './metadata.json';

import {getImageFiles, generateFiles, generateZip, reconcileWebsite} from "./content/content";

import {throttledLog} from "./lib/log";

import MainNav from './components/MainNav';
import Content from './components/Content';

const ADMIN_TITLE = window.location.hostname;
const tLog = throttledLog();

export const PromptContext = React.createContext({});

class App extends Component {
  componentDidMount() {
    document.title = ADMIN_TITLE;
  }

  constructor(props) {
    super(props);

    this.state = {
      isValidDevice: isValidDevice(),
      nav: {
        selectedIndex: 0,
      },

      content: {
        images: [],
        initialImages: undefined,
        shared: {
          backgroundImage: metadata.backgroundImage,
        },
        translations: metadata.translations,
      },
    };

    window.addEventListener("resize", _.throttle(() => this.setState({ isValidDevice: isValidDevice() })), 1000);

    getImageFiles().then((files) => {
      this.setState(update(this.state, { content: { $merge: { initialImages: files } } }));
    }).catch((e) => {
      console.log("Failure getting images", e);
    });
  }

  generateFiles = () => generateFiles(this.state.content);
  generateZip = (files) => generateZip(ADMIN_TITLE, files, this.state.content.images);
  reconcileWebsite = (files) => reconcileWebsite(files, this.state.content.images);

  handleImagesChange = (operation, file) => {
    this.setState(update(this.state, { content: { images: this.operationToImageSpec(operation, file) } }));
  };

  operationToImageSpec(operation, file) {
    switch(operation) {
      case 'add': return {$push: [file]};
      case 'remove': return {$splice: [[this.state.content.images.indexOf(file), 1]]};
      default: return;
    }
  }

  handleTranslationChange = (index, translationsUpdate, callback) => {
    this.setState(update(this.state, { content: { $merge: { translations: translationsUpdate } } }), () => {
      tLog(this.state.content.translations[index]);
      if (callback) callback();
    });
  };

  handleSharedChange = (state) =>{
    this.setState(update(this.state, { content: { $merge: { shared: state } }}));
  };

  render () {
    let containerDisplay = this.state.isValidDevice ? "" : "none";
    return (
        <div>
          { this.state.isValidDevice ? undefined : "Please use a computer to access this website" }
          <Container style={{display: containerDisplay}}>
            <MainNav title={ADMIN_TITLE} generateFiles={this.generateFiles} generateZip={this.generateZip} reconcileWebsite={this.reconcileWebsite}/>
            <Content object={this.state.content} onImagesChange={this.handleImagesChange} onSharedChange={this.handleSharedChange} onTranslationChange={this.handleTranslationChange}/>
          </Container>
        </div>
    )
  }
}

export default App;

require('matchmedia-polyfill');
require('matchmedia-polyfill/matchMedia.addListener');

function isValidDevice() {
  return matchMedia('screen and (min-width: 768px)').matches;
}