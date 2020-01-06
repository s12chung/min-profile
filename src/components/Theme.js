import React, {Component} from 'react';
import {Col, FormControl, Nav, Row} from 'react-bootstrap';
import update from 'immutability-helper';
import _ from "lodash";

class Theme extends Component {
    constructor(props) {
        super(props);

        this.state = { selectedFileIndex: 0 };
    }

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
            <Row style={this.props.style}>
                <Col>
                    <Nav activeKey={selectedFile.name} variant="tabs" onSelect={this.selectFile}>
                        {this.props.object.files.map((file) => <Nav.Item key={file.name}><Nav.Link eventKey={file.name}>{file.name}</Nav.Link></Nav.Item>)}
                    </Nav>
                    <FormControl as='textarea' className={"text-monospace theme-file-textarea"} value={selectedFile.content} onChange={this.handleFileChange} />
                </Col>
            </Row>
        )
    }
}

export default Theme;