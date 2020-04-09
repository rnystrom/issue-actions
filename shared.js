"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function makeChecklistMarker(label, repo) {
    return `<!-- DO NOT MODIFY: ${label.name}:${repo.owner}/${repo.name} -->`;
}
exports.makeChecklistMarker = makeChecklistMarker;
function updateBodyChildChecklists(body, childURL, checked) {
    return body.replace(makeChecklist(childURL, !checked), makeChecklist(childURL, checked));
}
exports.updateBodyChildChecklists = updateBodyChildChecklists;
function makeParentMarker(owner, repo, number) {
    return `<!-- PARENT-ID: ${owner}/${repo}#${number} -->`;
}
exports.makeParentMarker = makeParentMarker;
function getParent(body) {
    const regex = new RegExp('<!-- PARENT-ID: ([a-zA-Z-_]+)/([a-zA-Z-_]+)#([0-9]+) -->');
    const match = regex.exec(body);
    if (match == null || match.length != 4) {
        return null;
    }
    const number = Number(match[3]);
    if (number == NaN) {
        return null;
    }
    return {
        repo: {
            owner: match[1],
            name: match[2]
        },
        number: number
    };
}
exports.getParent = getParent;
function makeChecklist(childURL, checked) {
    const check = checked ? "x" : " ";
    return `- [${check}] ${childURL}`;
}
exports.makeChecklist = makeChecklist;
