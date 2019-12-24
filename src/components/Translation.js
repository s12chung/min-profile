import React, {Component} from 'react';
import {Form, FormControl} from 'react-bootstrap';
import FieldComponent, { FieldContext } from "./FieldComponent";

const inputsKeys = [
    'lang',
    'htmlTitle',
    'title',
    'subtitle',
];

class Translation extends Component {
    handleChange = (change)=> {
        this.props.onChange(change);
    };

    render() {
        const translation = this.props.object;
        const markdownKey = 'markdown';
        return (
            <Form>
                {inputsKeys.map((k) => {
                    return (
                        <FieldComponent key={k} k={k} text={k} onChange={this.handleChange}>
                            <FieldContext.Consumer>
                                {({ id, handleChange }) => {
                                    return <FormControl id={id} value={translation[k]} onChange={handleChange} />
                                }}
                            </FieldContext.Consumer>
                        </FieldComponent>
                    );
                })}
                <FieldComponent key={markdownKey} k={markdownKey} text={markdownKey} onChange={this.handleChange}>
                    <FieldContext.Consumer>
                        {({ id, handleChange }) => {
                            return <FormControl as='textarea'id={id} value={translation[markdownKey]} onChange={handleChange} />
                        }}
                    </FieldContext.Consumer>
                </FieldComponent>
            </Form>
        )
    }
}

export default Translation;