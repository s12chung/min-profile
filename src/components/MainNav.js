import React, {Component} from 'react';
import {Button, ButtonToolbar, Navbar, Nav} from "react-bootstrap";
import update from "immutability-helper";

const HEADERS = ["Content"];

class MainNav extends Component {
    constructor(props) {
        super(props);
        this.state = {
            isLoading: false,
            status: '',
        };
    }

    setStatus(status, isLoading) {
        this.setState(update(this.state, { $merge: { status: status, isLoading: !!isLoading }}));
    }
    
    download = () => {
        return this.props.generateFiles().then((...args) => {
            this.setStatus("Generating Zip", true);
            return this.props.generateZip(...args);
        }).then(() => {
            this.setStatus("");
        });
    };

    deploy = () => {
        this.setStatus("Generating Files", true);
        return this.props.generateFiles().then((...args) => {
            this.setStatus("Uploading", true);
            return this.props.reconcileWebsite(...args);
        }).then(() => {
            this.setStatus("Deployed!");
        }).catch((e) => {
            console.log("Failure Deploying", e);
            this.setStatus(`Failure Deploying: ${e}`);
        });
    };

    render() {
        return (
            <Navbar>
                <Navbar.Brand>{this.props.title}</Navbar.Brand>
                <Nav className="mr-auto">
                    {HEADERS.map((header) => <Nav.Link key={header} eventKey={header}>{header}</Nav.Link>)}
                    <div className="d-flex ml-3">
                        { this.state.isLoading && <div className="lds-facebook"><div></div><div></div><div></div></div>  }
                        <div className="align-self-center">{this.state.status}</div>
                    </div>
                </Nav>

                <ButtonToolbar>
                    <Button className="m-1" variant="outline-secondary" onClick={this.download}>Download</Button>
                    <Button className="m-1" variant="outline-primary">Save</Button>
                    <Button className="m-1" onClick={this.deploy}>Deploy</Button>
                </ButtonToolbar>
            </Navbar>
        )
    }
}

export default MainNav;