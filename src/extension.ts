/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Harness, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';
import { runStep, runSteps } from './commands/stepRunner';
import { create as DroneCli, initDroneContext } from './drone';
import { failed } from './errorable';
import { providerDroneCompletions } from './services/completionProvider';
import { NewInstaller as DroneCliInstaller } from './util/installDroneCli';
import { affectsUs } from './util/settings';

export let contextGlobalState: vscode.ExtensionContext;

export async function activate(
  context: vscode.ExtensionContext
): Promise<void> {
  contextGlobalState = context;

  const droneCliInstaller = DroneCliInstaller();
  const installResult = await droneCliInstaller.installOrUpgradeDroneCli();

  if (failed(installResult)) {
    vscode.window.showErrorMessage(
      `Error downloading drone cli ${installResult.error}`
    );
  }

  const droneContext = await initDroneContext();
  const droneCli = await DroneCli(droneContext);

  const disposables = [
    vscode.commands.registerCommand('vscode-drone.about', () =>
      droneCli.about()
    ),

    vscode.commands.registerCommand('vscode-drone.run', () => droneCli.exec()),
    vscode.commands.registerCommand('vscode-drone.addDroneToPath', () =>
      droneCli.addDroneCliToPath()
    ),
    vscode.commands.registerCommand('vscode-drone.runStep', () =>
      runStep(droneCli)
    ),
    vscode.commands.registerCommand('vscode-drone.runSteps', () =>
      runSteps(droneCli)
    ),
  ];

  disposables.forEach((e) => context.subscriptions.push(e));

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  vscode.workspace.onDidChangeConfiguration((e) => {
    if (affectsUs) {
      droneCli.handleConfigChange();
    }
  });

  //completion provider
  vscode.languages.registerCompletionItemProvider('drone', {
    provideCompletionItems: providerDroneCompletions
  });

}

// this method is called when your extension is deactivated
// eslint-disable-next-line @typescript-eslint/no-empty-function
export function deactivate(): void {}
