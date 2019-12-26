import React, {Component} from 'react';
import Dropzone from 'react-dropzone-uploader'

class Uploader extends Component {
    handleChangeStatus = (meta, status) => {
        console.log(status, meta)
    };

    render() {
        return (
            <Dropzone
                addClassNames={ { dropzone: 'uploader' } }
                onChangeStatus={this.handleChangeStatus}
                SubmitButtonComponent={null}
                previewShowImageTitle={true}

                accept="image/*"
                disabled={this.props.disabled}
                initialFiles={this.props.initialFiles}
            />
        )
    }
}

export default Uploader;