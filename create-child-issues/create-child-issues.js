"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const github = require('@actions/github');
const core = require('@actions/core');
const shared_1 = require("../shared");
// converts string like "owner/name,owner/name" into an array of repos
function makeRepositories(arr) {
    var repos = new Array();
    for (var i in arr) {
        var parts = arr[i].split('/');
        if (parts.length != 2) {
            core.warning(`Failed to parse owner/name from repository: ${arr[i]}`);
            continue;
        }
        repos.push({
            owner: parts[0],
            name: parts[1]
        });
    }
    return repos;
}
// converts string like "my-label:owner/name,owner/name bug:owner/name" into an array of labels
function makeLabels(str) {
    var labels = new Array();
    const jsonArray = JSON.parse(str);
    for (var i in jsonArray) {
        const name = jsonArray[i].label;
        if (name == null || name.length == 0) {
            core.setFailed(`Required key "label" is null or empty: ${jsonArray[i]}`);
        }
        const reposArray = jsonArray[i].repos;
        if (reposArray == null) {
            core.setFailed(`Required key "repos" is null: ${jsonArray[i]}`);
        }
        const repos = makeRepositories(reposArray);
        const addLabels = jsonArray[i].addLabels == null ? Array() : jsonArray[i].addLabels;
        // only push the label if there are repos mapped to it
        if (repos.length > 0) {
            labels.push({
                name: name,
                labels: addLabels,
                repositories: repos
            });
        }
    }
    return labels;
}
const run = async () => {
    // get the issue from the payload
    const issue = github.context.payload.issue;
    if (!issue) {
        core.setFailed("No issue found on Actions context");
        return;
    }
    const token = process.env['GITHUB_TOKEN'];
    if (!token) {
        core.setFailed("No GITHUB_TOKEN environment variable found");
        return;
    }
    // get all configs
    const labelsJSONString = core.getInput('labels');
    const labels = makeLabels(labelsJSONString);
    // must have at least one label
    if (labels.length <= 0) {
        core.setFailed(`Did not correctly parse labels for input: ${labelsJSONString}`);
        return;
    }
    const client = new github.GitHub(token);
    const parentMarker = shared_1.makeParentMarker(github.context.payload.repository.owner.login, github.context.payload.repository.name, issue.number);
    const childDisclaimer = "<sub><em>This issue's state will automatically sync with the parent issue.</em></sub>";
    const childBody = `<!-- DO NOT MODIFY: Auto-managed child issue -->\n${parentMarker}\nParent issue: ${issue.html_url}\n${childDisclaimer}`;
    var updateLabels = issue.labels;
    var prependChecklists = new Array();
    for (var i in labels) {
        const label = labels[i];
        // only create child issues for assigned labels
        const foundIndex = updateLabels.findIndex(x => x.name == label.name);
        if (foundIndex == -1) {
            core.debug(`Ignoring label ${label.name}`);
            continue;
        }
        console.log(`Processing child issues for label: ${label.name}`);
        // remove label from original issue
        updateLabels.splice(foundIndex, 1);
        for (var j in label.repositories) {
            const repo = label.repositories[j];
            // use this marker to check if a child issue was already created for this label+repo
            const marker = shared_1.makeChecklistMarker(label, repo);
            // check if the child issue was already created
            if (issue.body.includes(marker)) {
                console.log(`Issue marker exists for ${label.name}: ${repo.owner}/${repo.name}, skipping`);
                continue;
            }
            try {
                const issueCreateResponse = await client.issues.create({
                    owner: repo.owner,
                    repo: repo.name,
                    title: issue.title,
                    body: childBody,
                    labels: label.labels
                });
                console.log(`Created issue: ${issueCreateResponse.data.html_url}`);
                // formatted checklist item that is prepended to the parent issue
                // append the marker so issue is not regenerated
                prependChecklists.push(shared_1.makeChecklist(issueCreateResponse.data.html_url, false) + ` ${marker}`);
            }
            catch (error) {
                core.error(`Failed to create child issue: ${error}`);
            }
        }
    }
    var newBody;
    // do not edit the issue body if no child issues were created
    if (prependChecklists.length == 0) {
        console.log("No child issue changes need updated");
        newBody = issue.body;
    }
    else {
        const checklistStartMarker = "<!-- DO NOT MODIFY: Begin auto-managed issue checklist -->";
        const prependedList = `${checklistStartMarker}\n${prependChecklists.join("\n")}`;
        if (issue.body.includes(checklistStartMarker)) {
            newBody = issue.body.replace(checklistStartMarker, prependedList);
        }
        else {
            const disclaimer = "<sub><em>This checklist is automatically managed by the <code>sync-child-issues</code> action. Please do not modify.</em></sub>";
            newBody = issue.body.concat(`\n\n<hr />\n\n#### Generated issues:\n${prependedList}\n\n${disclaimer}`);
        }
        core.debug(`Updating body:${newBody}`);
    }
    try {
        await client.issues.update({
            owner: github.context.payload.repository.owner.login,
            repo: github.context.payload.repository.name,
            issue_number: issue.number,
            body: newBody,
            labels: updateLabels.map(x => x.name)
        });
    }
    catch (error) {
        core.setFailed(`Failed updating parent issue: ${error}`);
    }
};
run();
exports.default = run;
