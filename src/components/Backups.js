import React, {Component} from 'react';
import {Col, Row, Button, Form, FormControl, FormLabel} from 'react-bootstrap';
import BarLoader from "./BarLoader";
import update from "immutability-helper";
import {DATE_SEPARATOR} from "../website/website";

class Backups extends Component {
    constructor(props) {
        super(props);
        this.state = {
            newBackupName: '',
            isLoading: false,
            status: '',
            selectedBackupName: this.props.object.folders[0],
        };
    }

    setStatus = (status, isLoading) => {
        this.setState(update(this.state, { $merge: { status: status, isLoading: !!isLoading }}));
    };

    handleBackupNameChange = (e) => {
        this.setState(update(this.state, { $merge: { newBackupName: e.target.value }}));
    };

    handleBackupCreate = () => {
        this.props.createBackup(this.state.newBackupName, this.setStatus).then((name) => {
            this.setState(update(this.state, { $merge: { selectedBackupName: name }}));
        });
    };

    handleBackupSelect = (e) => {
        this.setState(update(this.state, { $merge: { selectedBackupName: e.currentTarget.selectedOptions[0].value }}));
    };

    handleBackupDelete = () => {
        let simpleName = this.state.selectedBackupName.split(DATE_SEPARATOR).slice(0,-1).join(DATE_SEPARATOR);
        let promptName = window.prompt(`Deleting "${this.state.selectedBackupName}". Please type the name without date to confirm deletion: ${simpleName}`);
        if (promptName !== simpleName) {
            window.alert("Typed name does not match.");
            return;
        }

        let objectState = update(this.props.object, { $merge: { folders: { $splice: [[this.props.object.folders.indexOf(this.state.selectedBackupName), 1]] } } });
        this.props.deleteBackup(this.state.selectedBackupName, objectState, this.setStatus).then(() => {
            this.setState(update(this.state, { $merge: { selectedBackupName: this.props.object.folders[0] }}));
        });
    };

    handleBackupRestore = () => {
        let confirm = window.confirm(`Are you sure you want to restore backup? ${this.state.selectedBackupName}`);
        if (!confirm) return;
        this.props.restoreBackup(this.state.selectedBackupName, this.setStatus)
    };

    render() {
        return (
            <Row style={this.props.style}>
                <Col>
                    <div className="d-flex">
                        <h2 className="mr-1">Backup</h2>
                        { this.state.isLoading && <BarLoader/>}
                        <div className="align-self-center">{this.state.status}</div>
                    </div>
                    <FormLabel>Create</FormLabel>
                    <div className="d-flex">
                        <FormControl value={this.state.newBackupName} placeholder="New Backup Name" onChange={this.handleBackupNameChange}/>
                        <Button className="ml-1" variant="outline-primary" onClick={this.handleBackupCreate}>Create</Button>
                    </div>
                    <hr/>
                    <Form>
                        <Form.Group>
                            <Form.Label>Restore and Delete</Form.Label>
                            <div className="d-flex">
                                <Form.Control as="select" value={this.state.selectedBackupName} onChange={this.handleBackupSelect}>
                                    {this.props.object.folders.map((f) => <option key={f}>{f}</option>)}
                                </Form.Control>
                                <Button className="ml-1" variant="outline-danger" onClick={this.handleBackupDelete}>Delete</Button>
                                <Button className="ml-1" variant="outline-success" onClick={this.handleBackupRestore}>Restore</Button>
                            </div>
                        </Form.Group>
                    </Form>
                </Col>
            </Row>
        )
    }
}

export default Backups;