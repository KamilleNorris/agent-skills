# SonarQube

## Collect

Use the SonarQube CLI (`sonar`) when it's installed and `sonar auth status` reports a connected session. It finds the project key from the repository and prints which one it used on stderr; if it can't, pass `-p <key>`, which the SonarQube check's link carries as `id=<key>`.

1. **Quality gate**, which decides whether the check passes. Coverage, duplication or unreviewed hotspots can fail it with no open issues at all.

   ```bash
   sonar api get "/api/qualitygates/project_status?projectKey=<key>&pullRequest=<number>"
   ```

   Each failing condition (`status: "ERROR"`) is an item: compare `actualValue` with `errorThreshold`. A coverage condition is fixed with tests for the PR's new code.

2. **Issues**: `sonar list issues --pull-request <number> --format json`. Each issue has a `rule`, `message`, `severity`, `component` (the file path, prefixed with `<key>:`) and `textRange` for its lines.

3. **Security hotspots**, when the gate's `new_security_hotspots_reviewed` condition fails: `sonar api get "/api/hotspots/search?projectKey=<key>&pullRequest=<number>"`.

Without the CLI, use what's on the PR: the SonarQube check status and its summary comment. Tell the user the issue-level detail needs the CLI and a `sonar auth login`, then continue with the rest of the list.

## Triage

Triage issues like review comments. Reviewing a hotspot is a judgement for the user in SonarQube; summarize each one and its risk for them.

## Reply

SonarQube has no thread to reply on. For each issue marked "no change", list the reason for the user, who decides whether to mark it accepted or false positive in SonarQube.
