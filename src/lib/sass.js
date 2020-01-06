import Sass from 'sass.js';

export function renderCssPromise(sassFiles) {
    return new Promise((resolve, reject) => {
        Sass.compile(sassFiles.map((file) => file.content).join("\n"), function (result) {
            console.log("SASS Result");
            console.log(result);
            if (result.status === 0) {
                resolve(result.text)
            }
            reject(new Error(`Failed to compile sass. Status: ${result.status}`));
        });
    });
}