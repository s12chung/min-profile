import React, {Component} from 'react';
import {Alert, Col, Row} from 'react-bootstrap';
import _ from 'lodash';

class CredentialsAlerts extends Component {
    constructor(props) {
        super(props);
        this.state = {
            hideEarlyWarning: false,
            hideSaveWarning: false,
            hideLastWarning: false,
            saved: false,
        }
    }

    render() {
        let minutesLeft = this.props.object.minutesLeft;
        if (_.isBlank(minutesLeft)) minutesLeft = 9999999999;

        let showEarlyWarning = !this.state.hideEarlyWarning && minutesLeft <= 5;
        let saveMinutesLeft = 3;
        let showSaveWarning = !this.state.hideSaveWarning && minutesLeft <= saveMinutesLeft;
        let showLastWarning = !this.state.hideLastWarning && minutesLeft <= 1;

        if (showSaveWarning && !this.state.saved) {
            console.log("Starting auto-save");
            this.props.save().then(() => this.setState({ saved: true }));
        }

        return (
            <Row>
                <Col>
                    {showEarlyWarning ? <Alert variant="warning" onClose={() => this.setState({ hideEarlyWarning: true })} dismissible>
                        {minutesLeft} until Saving and Deploying credentials expire. Please save and refresh your browser.
                    </Alert> : ''}
                    {showSaveWarning ? <Alert variant="warning" onClose={() => this.setState({ hideSaveWarning: true })} dismissible>
                        {minutesLeft} minutes until Saving and Deploying credentials expire. { this.state.saved ? 'The UI auto-saved your changes.' : '' }
                    </Alert> : ''}
                    {showLastWarning ? <Alert variant="danger" onClose={() => this.setState({ hideLastWarning: true })} dismissible>
                        Saving and Deploying credentials have expired after 1h, please refresh. (the UI auto-saved {saveMinutesLeft} mins before expiring)
                    </Alert> : ''}
                </Col>
            </Row>
        )
    }
}

export default CredentialsAlerts;