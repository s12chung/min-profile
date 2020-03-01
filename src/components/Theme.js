import React, {Component} from 'react';
import {Col, FormControl, Nav, Row} from 'react-bootstrap';
import update from 'immutability-helper';
import _ from "lodash";
import Uploader from "./Uploader";

const VALID_FILENAMES = [
    "favicon-32x32.png",
    "android-chrome-192x192.png",
    "android-chrome-512x512.png",
    "apple-touch-icon.png",
    "browserconfig.xml",
    "favicon-16x16.png",
    "favicon.ico",
    "mstile-150x150.png",
    "safari-pinned-tab.svg",
    "site.webmanifest"
];

class Theme extends Component {
    constructor(props) {
        super(props);

        this.state = { selectedFileIndex: 0 };
    }

    validateFaviconFile = (file) => {
        if (_.findIndex(this.props.object.faviconFiles, (existing) => existing.name === file.name) !== -1) return 'duplicate file name detected';
        if (_.indexOf(VALID_FILENAMES, file.name) === -1) return `invalid file. valid files are: ${VALID_FILENAMES.join(" ,")}`;
        return false
    };

    selectFile = (fileName) => {
        this.setState({ selectedFileIndex: _.findIndex(this.props.object.files, { name: fileName }) });
    };

    handleFileChange = (e) => {
        let index = this.state.selectedFileIndex;
        this.props.onFileChange(index, update(this.props.object, { files: { [index]: { content: { $set: e.target.value } } } }));
    };

    render() {
        let selectedFile = this.props.object.files[this.state.selectedFileIndex];

        return (
            <div style={this.props.style}>
                <Row>
                    <Col>
                        <h3>Favicon</h3>
                        <p>
                        Upload files generated from: <a href="https://realfavicongenerator.net" target="_blank" rel="noopener noreferrer">https://realfavicongenerator.net</a>
                        </p>
                        <Uploader initialFiles={this.props.object.initialFaviconFiles} onChange={this.props.onFaviconFilesChange} validate={this.validateFaviconFile}/>
                    </Col>
                </Row>
                <Row>
                    <Col>
                        <Nav activeKey={selectedFile.name} variant="tabs" onSelect={this.selectFile}>
                            {this.props.object.files.map((file) => <Nav.Item key={file.name}><Nav.Link eventKey={file.name}>{file.name}</Nav.Link></Nav.Item>)}
                        </Nav>
                        <FormControl as='textarea' className={"text-monospace theme-file-textarea"} value={selectedFile.content} onChange={this.handleFileChange} />
                    </Col>
                </Row>
            </div>
        )
    }
}

export default Theme;