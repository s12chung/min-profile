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

    setStatus = (status, isLoading) => {
        this.setState(update(this.state, { $merge: { status: status, isLoading: !!isLoading }}));
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
                    <Button className="m-1" variant="outline-secondary" onClick={() => this.props.download(this.setStatus)}>Download</Button>
                    <Button className="m-1" variant="outline-primary" onClick={() => this.props.save(this.setStatus)}>Save</Button>
                    <Button className="m-1" onClick={() => this.props.deploy(this.setStatus)}>Deploy</Button>
                </ButtonToolbar>
            </Navbar>
        )
    }
}

export default MainNav;