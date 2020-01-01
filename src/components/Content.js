import React, {Component} from 'react';
import {Col, Form, FormControl, Row} from 'react-bootstrap';
import Uploader from "./Uploader";
import {FieldComponentForKey} from "./FieldComponent";
import Translations from "./Translations";
import _ from "lodash";

const INPUT_KEYS = ["backgroundImage"];

class Content extends Component {
    validateImage = (file) => {
        if (_.findIndex(this.props.object.images, (existing) => existing.name === file.name) === -1) return false;
        return 'duplicate file name detected';
    };

    render() {
        return (
            <div>
                <Row>
                    <Col md={8}>
                        <Uploader initialFiles={this.props.object.initialImages} onChange={this.props.onImagesChange} validate={this.validateImage}/>
                    </Col>
                    <Col>
                        <Form>
                            {INPUT_KEYS.map((k) => FieldComponentForKey(k, this.props.object.shared, this.props.onSharedChange, (id, handleChange, value) => {
                                return <FormControl id={id} value={value} onChange={handleChange} />
                            }))}
                        </Form>
                    </Col>
                </Row>
                <Translations translations={this.props.object.translations} onChange={this.props.onTranslationChange}/>
            </div>
        )
    }
}

export default Content;