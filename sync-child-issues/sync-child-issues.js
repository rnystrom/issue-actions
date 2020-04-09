"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const github = require('@actions/github');
const core = require('@actions/core');
const shared_1 = require("../shared");
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
    const parentIssue = shared_1.getParent(issue.body);
    if (parentIssue == null) {
        console.log("No parent issue found, bailing");
        return;
    }
    console.log(`Found parent issue: ${parentIssue.repo.owner}/${parentIssue.repo.name}#${parentIssue.number}`);
    console.log(`Updating checklists to: ${issue.state}`);
    const checked = issue.state == "closed";
    const client = new github.GitHub(token);
    try {
        const issueGetResponse = await client.issues.get({
            owner: parentIssue.repo.owner,
            repo: parentIssue.repo.name,
            issue_number: parentIssue.number
        });
        await client.issues.update({
            owner: parentIssue.repo.owner,
            repo: parentIssue.repo.name,
            issue_number: parentIssue.number,
            body: shared_1.updateBodyChildChecklists(issueGetResponse.data.body, issue.html_url, checked)
        });
    }
    catch (error) {
        core.setFailed(`Failed getting or updating parent issue: ${error}`);
    }
};
run();
exports.default = run;
