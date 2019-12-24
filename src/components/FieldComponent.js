import React, {Component} from 'react';
import { randomString } from '../lib/random';
import { FormGroup, FormLabel } from 'react-bootstrap';

export const FieldContext = React.createContext({});

class FieldComponent extends Component {
    constructor(props) {
        super(props);
        this.handleChange = this.handleChange.bind(this);
        this.state = { id: [this.props.k, randomString()]  }
    }

    handleChange(e) {
        this.props.onChange({ [this.props.k]: e.target.value });
    }

    render() {
        return (
            <FieldContext.Provider value={ {id: this.state.id, handleChange: this.handleChange } }>
                <FormGroup>
                    <FormLabel htmlFor={this.state.id}>{this.props.text}</FormLabel>
                    {this.props.children}
                </FormGroup>
            </FieldContext.Provider>
        )
    }
}

export default FieldComponent;