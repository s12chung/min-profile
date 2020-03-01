import React, {Component} from 'react';
import 'react-dropzone-uploader/dist/styles.css'
import Dropzone from 'react-dropzone-uploader'
import _ from 'lodash';

const STATUS_TO_OPERATION = {
    'done': 'add',
    'removed': 'remove',
};

class Uploader extends Component {
    constructor(props) {
        super(props);
        this.state = { syncedWithInitialCount: 0, isReady: this.isReady(0) };
    }

    isReady(syncedWithInitialCount) {
        if (!_.isArray(this.props.initialFiles)) return false;
        return syncedWithInitialCount === this.props.initialFiles.length;
    }

    validate = (meta)=> {
        return this.props.validate(meta.file);
    };

    handleChangeStatus = (meta, status) => {
        if (meta.meta.validationError) return;
        if (!this.state.isReady) {
            if (status === 'done') {
                let count = this.state.syncedWithInitialCount + 1;
                this.setState({ syncedWithInitialCount: count, isReady: this.isReady(count) });
            }
        }
        let operation = STATUS_TO_OPERATION[status];
        if (!operation) return;
        this.props.onChange(operation, meta.file);
    };

    render() {
        return (
            <Dropzone
                addClassNames={ { dropzone: 'uploader' } }
                onChangeStatus={this.handleChangeStatus}
                validate={this.validate}
                SubmitButtonComponent={null}
                previewShowImageTitle={true}

                accept={this.props.accept}
                disabled={!this.state.isReady}
                initialFiles={this.props.initialFiles}
            />
        )
    }
}

export default Uploader;