import React, {Component} from 'react';
import {Row, Col, Nav} from 'react-bootstrap';
import update from 'immutability-helper';
import _ from 'lodash';

import Translation from "./Translation";
import {newTranslation} from "../models/translation";
import {PromptContext} from "../App";

const PLUS_LANG = "+";
const MAIN_TRANSLATION_OFFSET = 1;

class Translations extends Component {
    constructor(props) {
        super(props);

        this.state = { selectedTranslationIndex: MAIN_TRANSLATION_OFFSET };
    }

    indexOfLang(lang) {
        return this.props.translations.findIndex((translation) => translation.lang === lang);
    }

    selectTranslation = (lang) => {
        let callback = () => this.setState({ selectedTranslationIndex: this.indexOfLang(lang) });
        if (lang === PLUS_LANG) {
            lang = this.promptLang();
            if (_.isBlank(lang)) return;
            this.props.onChange(this.props.translations.length, update(this.props.translations,{ $push: [newTranslation(lang)]}), callback);
            return;
        }
        callback();
    };

    promptLang = (lang)=> {
        lang = window.prompt("Please enter a lang", lang);

        let errorMessage;
        if (_.isBlank(lang)) errorMessage = 'lang is empty. Aborting';
        for (let translation of this.props.translations) {
            if (translation.lang === lang) {
                errorMessage = `lang (${lang}) already exists. Aborting`;
                break;
            }
        }
        if (!_.isBlank(errorMessage)) {
            window.alert(errorMessage);
            return;
        }

        return lang;
    };

    handleTranslationChange = (index, change) => {
        this.props.onChange(index, update(this.props.translations, {[index]: { $merge: change }}));
    };

    handleTranslationReorder = () => {
        let from = this.state.selectedTranslationIndex - MAIN_TRANSLATION_OFFSET;
        let maxTo = this.props.translations.length - 1 - MAIN_TRANSLATION_OFFSET;
        let to = window.prompt(`Please enter an index from 0 to ${maxTo}`, from.toString());
        to = _.parseInt(to, 10);

        let errorMessage;
        if (_.isNaN(to)) errorMessage = 'index is invalid. Aborting';
        if (to < 0) errorMessage = 'index < 0. Aborting';
        if (to > maxTo) errorMessage = `index > ${maxTo}. Aborting`;
        if (!_.isBlank(errorMessage)) {
            window.alert(errorMessage);
            return;
        }

        if (from === to) return;

        from += MAIN_TRANSLATION_OFFSET;
        to += MAIN_TRANSLATION_OFFSET;

        let translation = this.props.translations[from];
        this.props.onChange(from, update(this.props.translations, { $splice: [
                [from, 1],
                [to, 0, translation]
            ] }), () => {
            this.setState({ selectedTranslationIndex: to });
        });
    };

    handleTranslationDelete = () => {
        let selectedTranslationLang = this.props.translations[this.state.selectedTranslationIndex].lang;
        let lang = window.prompt(`Please type the lang to confirm deletion: ${selectedTranslationLang}`);
        if (lang !== selectedTranslationLang) {
            window.alert("Typed lang does not match.");
            return;
        }

        let from = this.state.selectedTranslationIndex;
        let futureLength = this.props.translations.length - 1;
        if (futureLength > MAIN_TRANSLATION_OFFSET) {
            this.setState( { selectedTranslationIndex: from === futureLength ? futureLength - 1 : from });
        }

        this.props.onChange(from, update(this.props.translations, { $splice: [[from, 1],] }));
    };

    render() {
        let mainTranslation = this.props.translations[0];
        let selectedTranslationIndex = this.state.selectedTranslationIndex;
        let selectedTranslation = this.props.translations[selectedTranslationIndex];
        let sideTranslations = this.props.translations.slice(1);
        return (
            <PromptContext.Provider value={{promptLang: this.promptLang}}>
            <Row>
                <Col>
                    <Nav activeKey={mainTranslation.lang} variant="tabs">
                        <Nav.Item><Nav.Link eventKey={mainTranslation.lang}>{mainTranslation.lang}</Nav.Link></Nav.Item>
                    </Nav>
                    <Translation object={mainTranslation} onChange={(c) => this.handleTranslationChange(0, c)}/>
                </Col>
                <Col>
                    <Nav activeKey={(selectedTranslation || {}).lang} variant="tabs" onSelect={this.selectTranslation}>
                        {sideTranslations.map((t) => <Nav.Item key={t.lang}><Nav.Link eventKey={t.lang}>{t.lang}</Nav.Link></Nav.Item>)}
                        <Nav.Item key={PLUS_LANG}><Nav.Link eventKey={PLUS_LANG}>{PLUS_LANG}</Nav.Link></Nav.Item>
                    </Nav>
                    {!_.isBlank(selectedTranslation) && (
                        <Translation object={selectedTranslation} onChange={(c) => this.handleTranslationChange(selectedTranslationIndex, c)} onTranslationReorder={this.handleTranslationReorder} onTranslationDelete={this.handleTranslationDelete}/>
                    )}
                </Col>
            </Row>
            </PromptContext.Provider>
        )
    }
}

export default Translations;