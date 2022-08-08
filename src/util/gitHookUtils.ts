/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Harness, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { GitExtension, Repository } from '../types/git';
import { getToolLocationFromConfig, isRunTrusted } from './settings';
import * as fsex from 'fs-extra';
import * as path from 'path';
import * as Mustache from 'mustache';

export interface GitHookUtil {
  addPostCommitHook(): Promise<void>;
  updatePostCommitHook(): Promise<void>;
  removePostCommitHook(): Promise<void>;
}

interface GitContext {
  readonly droneFile: string;
  readonly gitRootFolder: vscode.WorkspaceFolder;
  readonly gitRepository: Repository;
}

const POST_COMMIT_TEMPLATE = `#!/usr/bin/env bash
set -e

{{&droneCommand}} exec  {{#trusted}} --trusted {{/trusted}} {{&droneFile}}
`;

export async function GitHookUtil(
  droneFile: string,
  gitRootFolder: vscode.WorkspaceFolder
): Promise<GitHookUtil> {
  const gitExtension =
    vscode.extensions.getExtension<GitExtension>('vscode.git').exports;
  const git = gitExtension.getAPI(1);

  //gitRepo will be null if the repository is not an existing git repo
  //i.e. no .git folder
  let gitRepo = await git.openRepository(gitRootFolder.uri);

  if (!gitRepo) {
    const initGitRepoRequest = await vscode.window.showInformationMessage(
      `No git repo available at workspace root ${gitRootFolder.uri.fsPath}, recommended to have git repository for doing continuous integration with Drone.`,
      'OK'
    );

    if (initGitRepoRequest === 'OK') {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Initializing git repository at "${gitRootFolder.uri.fsPath},"`,
          cancellable: false,
        },
        async (progress) => {
          gitRepo = await git.init(gitRootFolder.uri);
          progress.report({ increment: 100 });
          return;
        }
      );
    }
  }

  const gitContext: GitContext = {
    gitRootFolder,
    droneFile,
    gitRepository: gitRepo,
  };
  return new GitHookUtilImpl(gitContext);
}

class GitHookUtilImpl implements GitHookUtil {
  private readonly postCommitHookFile: string;
  constructor(private readonly context: GitContext) {
    this.context = context;
    this.postCommitHookFile = path.join(
      this.context.gitRepository.rootUri.fsPath,
      '.git',
      'hooks',
      'post-commit'
    );
  }

  async addPostCommitHook(): Promise<void> {
    await this.writeToPostCommitHookFile(true);
  }

  async removePostCommitHook(): Promise<void> {
    await fsex.remove(this.postCommitHookFile);
  }

  async updatePostCommitHook(): Promise<void> {
    this.writeToPostCommitHookFile();
  }

  private async writeToPostCommitHookFile(force?: boolean): Promise<void> {
    const hookFileExists = await fsex.pathExists(this.postCommitHookFile);
    if (hookFileExists || force) {
      const tplData = {
        droneCommand: getToolLocationFromConfig(),
        trusted: isRunTrusted(),
        droneFile: this.context.droneFile,
      };
      const postCommitScript = Mustache.render(POST_COMMIT_TEMPLATE, tplData);
      await fsex.outputFile(this.postCommitHookFile, postCommitScript, {
        mode: 0o755,
      });
    }
  }
}
