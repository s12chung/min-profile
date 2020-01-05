import React, {Component} from 'react';
import {ButtonToolbar, Button, Form, FormControl} from 'react-bootstrap';
import _ from 'lodash';

import { FieldComponentForKey } from "./FieldComponent";
import { PromptContext } from "../App";

const INPUT_KEYS = [
    'codes',
    'htmlTitle',
    'title',
    'subtitle',
];

class Translation extends Component {
    handleChange = (change)=> {
        this.props.onChange(change);
    };

    promptLang = ()=> {
        let lang = this.props.promptLang();
        if (_.isBlank(lang)) return;
        this.handleChange({ 'lang': lang });
    };

    render() {
        let translation = this.props.object;
        return (
            <Form>
                { FieldComponentForKey( 'lang', translation, this.handleChange,(id, handleChange, value) => {
                    return (
                        <div className="d-flex">
                            <FormControl id={id} value={value} disabled={true}/>
                            <PromptContext.Consumer>
                                {({ promptLang }) => <Button className="ml-1" variant="outline-primary" onClick={()=> promptLang(value)}>Change</Button>}
                            </PromptContext.Consumer>
                        </div>
                    )
                })}
                {INPUT_KEYS.map((k) => FieldComponentForKey(k, translation, this.handleChange,(id, handleChange, value) => {
                    return <FormControl id={id} value={value} onChange={handleChange} />
                }))}
                { FieldComponentForKey( 'markdown', translation, this.handleChange, (id, handleChange, value) => {
                    return <FormControl as='textarea' id={id} value={value} onChange={handleChange} rows='20' />
                })}

                <ButtonToolbar className="d-flex justify-content-end">
                    {_.isFunction(this.props.onTranslationReorder) && <Button className="m-1" variant="outline-primary" onClick={this.props.onTranslationReorder}>Reorder</Button>}
                    {_.isFunction(this.props.onTranslationDelete) && <Button className="m-1" variant='outline-danger' onClick={this.props.onTranslationDelete}>Delete</Button>}
                </ButtonToolbar>
            </Form>
        )
    }
}

export default Translation;