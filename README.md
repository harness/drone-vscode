# Visual Studio Code Drone Plugin

Visual Studio Code Drone Plugin allows you to manage and execute Drone pipelines on your machine without moving out of the editor.

> WARNING: This extension is under active development, please expect things to change faster.

## Features

The plugin currently supports the following features,

- [x] Download and install `drone` cli
- [x] Add `drone` to user local path
- [x] Ability to run `drone exec`
- [x] Create `.drone.yml` file with snippets support
- [x] Supports running the complete pipeline or individual steps
- [x] Integrates with Git, to allowing the pipelines to run on commit.
- [ ]  Integration with plugins.drone.io
- [ ]  Supporting intellisense for `.drone.yml` editing with plugin info

> Tip: Many popular extensions utilize animations. This is an excellent way to show off your extension! We recommend short, focused animations that are easy to follow.

## Extension Settings

This extension contributes the following settings:

- `vscode-drone.drone.checkUpgrade`: enable/disable this extension to check for `drone` cli upgrades

- `vscode-drone.runOnGitCommit`: enable/disable to allow the extension to add Git `post-commit` hook to the workspace.
  >NOTE: If the repository is not Git repo, the extension will prompt to initialize one.

- `vscode-drone.runTrusted`: enable/disable to add `--trusted` flag to `drone exec` runs.

- `vscode-drone.drone.cli.path`: The path where the `drone` cli is found on the users machine or the one that is downloaded and installed by the extension.

## Known Issues

- Currently when the _post-commit_ run logs the out to the Git **OUTPUT** channel.

## Release Notes

No release yet.

**Enjoy!**

## Disclaimer

This is not an officially supported Harness product.
