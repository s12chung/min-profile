import React, {Component} from 'react';
import {Container} from 'react-bootstrap';
import update from 'immutability-helper';
import _ from 'lodash';

import {getContent, download, save, deploy} from "./content/content";

import {throttledLog} from "./lib/log";
import {setCredentials} from "./lib/cognito";

import MainNav from './components/MainNav';
import BarLoader from "./components/BarLoader";
import Content from './components/Content';

const ADMIN_TITLE = window.location.hostname;
const tLog = throttledLog();

export const PromptContext = React.createContext({});

class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      initialized: false,
      initializedSuccess: false,
      isValidDevice: isValidDevice(),
      nav: {
        selectedIndex: 0,
      },

      content: {
        images: [],
        initialImages: undefined,
        shared: {
          backgroundImage: undefined,
        },
        translations: [],
      },
    };
  }

  componentDidMount() {
    document.title = ADMIN_TITLE;
    window.addEventListener("resize", _.throttle(() => {
      this.setState({ isValidDevice: isValidDevice() }, () => {
        this.initialize();
      });
    }), 1000);
    this.initialize();
  }

  initialize() {
    if (!this.state.isValidDevice) return;
    if (this.state.initialized) return;

    this.setState({ initialized: true }, () => {
      setCredentials()
          .then(() => {
            return getContent().then((content) => {
              this.setState({ initializedSuccess: true, content: content });
            }).catch((e) => {
              console.log("Failure getting images", e);
            });
          })
          // do nothing and redirect
          .catch(() => {});
    });
  }

  save = (setStatus) => save(this.state.content, setStatus);
  download = (setStatus) => download(ADMIN_TITLE, this.state.content, setStatus);
  deploy = (setStatus) => deploy(this.state.content, setStatus);

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
          { !this.state.initializedSuccess ? <BarLoader/> :
              <Container style={{display: containerDisplay}}>
                <MainNav title={ADMIN_TITLE} download={this.download} save={this.save} deploy={this.deploy}/>
                <Content object={this.state.content} onImagesChange={this.handleImagesChange}
                         onSharedChange={this.handleSharedChange} onTranslationChange={this.handleTranslationChange}/>
              </Container>
          }
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