import Mustache from "mustache";

export function renderHTML(template, vars) {
    return Mustache.render(template, vars);
}