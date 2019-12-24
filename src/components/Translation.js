import React, {Component} from 'react';
import {ButtonToolbar, Button, Form, FormControl} from 'react-bootstrap';
import _ from 'lodash';

import FieldComponent, { FieldContext } from "./FieldComponent";
import { PromptContext } from "../App";

const inputsKeys = [
    'htmlTitle',
    'title',
    'subtitle',
];

class Translation extends Component {
    handleChange = (change)=> {
        this.props.onChange(change);
    };

    fieldComponentForKey(k, component) {
        const translation = this.props.object;
        return (
            <FieldComponent key={k} k={k} text={k} onChange={this.handleChange}>
                <FieldContext.Consumer>
                    {({ id, handleChange }) => component(id, handleChange, translation[k])}
                </FieldContext.Consumer>
            </FieldComponent>
        )
    }

    promptLang = ()=> {
        let lang = this.props.promptLang();
        if (_.isUndefined(lang)) return;
        this.handleChange({ 'lang': lang });
    };

    render() {
        return (
            <Form>
                { this.fieldComponentForKey( 'lang', (id, handleChange, value) => {
                    return (
                        <div className='container-spaced'>
                            <FormControl id={id} value={value} disabled={true}/>
                            <PromptContext.Consumer>
                                {({ promptLang }) => <Button onClick={()=> promptLang(value)}>Change</Button>}
                            </PromptContext.Consumer>
                        </div>
                    )
                })}
                {inputsKeys.map((k) => this.fieldComponentForKey(k, (id, handleChange, value) => {
                    return <FormControl id={id} value={value} onChange={handleChange} />
                }))}
                { this.fieldComponentForKey( 'markdown', (id, handleChange, value) => {
                    return <FormControl as='textarea' id={id} value={value} onChange={handleChange} rows='20' />
                })}

                <ButtonToolbar className='container-spaced'>
                    {_.isFunction(this.props.onTranslationReorder) && <Button onClick={this.props.onTranslationReorder}>Reorder</Button>}
                    {_.isFunction(this.props.onTranslationDelete) && <Button onClick={this.props.onTranslationDelete} variant='danger'>Delete</Button>}
                </ButtonToolbar>
            </Form>
        )
    }
}

export default Translation;