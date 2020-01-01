import Mustache from "mustache";

export function htmlFilePromise(themeHtml, vars) {
    return new Promise((resolve) => {
        resolve(new File([Mustache.render(themeHtml, vars)], "index.html", { type: "text/html" }))
    });
}