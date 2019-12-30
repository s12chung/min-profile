import React, {Component} from 'react';
import { randomString } from '../lib/random';
import { FormGroup, FormLabel } from 'react-bootstrap';

export const FieldContext = React.createContext({});

class FieldComponent extends Component {
    constructor(props) {
        super(props);
        this.state = { id: [this.props.k, randomString()]  }
    }

    handleChange = (e)=> {
        this.props.onChange({ [this.props.k]: e.target.value });
    };

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

export function FieldComponentForKey(k, object, onChange, component) {
    return (
        <FieldComponent key={k} k={k} text={k} onChange={onChange}>
            <FieldContext.Consumer>
                {({ id, handleChange }) => component(id, handleChange, object[k])}
            </FieldContext.Consumer>
        </FieldComponent>
    )
}

export default FieldComponent;