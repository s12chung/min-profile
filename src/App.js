import React, {Component} from 'react';
import {Container} from 'react-bootstrap';
import update from 'immutability-helper';
import _ from 'lodash';

import {
  getContent,
  getBackups,
  download,
  save,
  deploy,
  createBackup,
  deleteBackup,
  restoreBackup,
  getTheme
} from "./website/website";

import {throttledLog} from "./lib/log";
import {setCredentials, minutesLeftForCredentials} from "./lib/cognito";

import MainNav from './components/MainNav';
import BarLoader from "./components/BarLoader";
import Content from './components/Content';
import Theme from './components/Theme';
import Backups from './components/Backups';

import CredentialsAlerts from "./components/CredentialsAlerts";

const ADMIN_TITLE = window.location.hostname;
const NAV_HEADERS = ["Content", "Theme", "Backups"];
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
      credentialsAlerts: {
        minutesLeft: undefined,
      },

      content: {
        images: [],
        initialImages: undefined,
        shared: {
          backgroundImage: undefined,
        },
        translations: [],
      },

      theme: {
        faviconFiles: [],
        initialFaviconFiles: undefined,
        files: [],
      },

      backups: {
        folders: [],
      }
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
            return Promise.all([getContent(), getBackups(), getTheme()]).then(([content, backups, theme]) => {
              this.setState({ initializedSuccess: true, content: content, backups: backups, theme: theme });
              this.checkCredentials();
              window.setInterval(this.checkCredentials, 60 * 1000)
            }).catch((e) => {
              console.log("Failure loading deploy", e);
            });
          })
          // do nothing and redirect
          .catch(() => {});
    });
  }

  checkCredentials = () => {
    this.setState(update(this.state, { credentialsAlerts: { $merge: {  minutesLeft: _.round(minutesLeftForCredentials()) } } }));
  };

  download = (setStatus) => download(ADMIN_TITLE, this.state.content, this.state.theme, setStatus);
  save = (setStatus) => save(this.state.content, this.state.theme, setStatus);
  deploy = (setStatus) => deploy(this.state.content, this.state.theme, setStatus);

  onHeaderSelect = (navHeader) => {
    this.setState(update(this.state, { nav: { $merge: {  selectedIndex: _.indexOf(NAV_HEADERS, navHeader) } } }));
  };

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

  handleFaviconFilesChange = (operation, file) => {
    this.setState(update(this.state, { theme: { faviconFiles: this.operationToImageSpec(operation, file) } }));
  };

  handleThemeFileChange = (index, themeUpdate, callback) => {
    this.setState(update(this.state, { theme: { $merge: themeUpdate } }), () => {
      tLog(this.state.theme.files[index]);
      if (callback) callback();
    });
  };

  createBackup = (name, setStatus) => {
    return createBackup(name, this.state.content, this.state.theme, setStatus)
        .then((name) => {
          this.setState(update(this.state, { backups: { folders: { $splice: [[0, 0, name]] } } }));
          return name;
        });
  };

  deleteBackup = (name, backups, setStatus) => Promise.resolve().then(() => {
    return deleteBackup(name, setStatus).then(() => {
      this.setState(update(this.state, { backups: backups }));
    });
  });

  restoreBackup = (name, setStatus) => {
    this.createBackup("before restore", setStatus).then(() => {
      return restoreBackup(name, setStatus);
    })
  };

  render () {
    let containerDisplay = this.state.isValidDevice ? "" : "none";
    let contentDisplay = this.state.nav.selectedIndex === 0 ? "" : "none";
    let themeDisplay = this.state.nav.selectedIndex === 1 ? "" : "none";
    let backupsDeploy = this.state.nav.selectedIndex === 2 ? "" : "none";

    return (
        <div>
          { this.state.isValidDevice ? undefined : "Please use a computer to access this website" }
          { !this.state.initializedSuccess ? <BarLoader/> :
              <Container style={{display: containerDisplay}}>
                <MainNav object={this.state.nav} title={ADMIN_TITLE} headers={NAV_HEADERS} onSelect={this.onHeaderSelect} download={this.download} save={this.save} deploy={this.deploy}/>
                <CredentialsAlerts object={this.state.credentialsAlerts} save={()=> this.save(()=>{})}/>
                <Content style={{display: contentDisplay}} object={this.state.content} onImagesChange={this.handleImagesChange}
                         onSharedChange={this.handleSharedChange} onTranslationChange={this.handleTranslationChange}/>
                <Theme style={{display: themeDisplay}} object={this.state.theme} onFileChange={this.handleThemeFileChange} onFaviconFilesChange={this.handleFaviconFilesChange}/>
                <Backups style={{display: backupsDeploy}} object={this.state.backups} createBackup={this.createBackup} deleteBackup={this.deleteBackup} restoreBackup={this.restoreBackup}/>
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