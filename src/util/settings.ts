/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Harness, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as path from 'path';
import * as vscode from 'vscode';
import { Platform } from './platform';

export const EXTENSION_CONFIG_KEY = 'vscode-drone';
export const DRONE_CLI_COMMAND = 'drone';

export function getInstallFolder(): string {
  return path.resolve(Platform.getUserHomePath(), `.${EXTENSION_CONFIG_KEY}`);
}

export function getToolLocation(installFolder?: string): string {
  if (!installFolder) {
    return path.resolve(getInstallFolder(), 'tools');
  } else {
    return path.resolve(installFolder, 'tools');
  }
}

export function affectsUs(change: vscode.ConfigurationChangeEvent): boolean {
  return change.affectsConfiguration(EXTENSION_CONFIG_KEY);
}

// START Config set and update
export async function addPathToConfig(
  configKey: string,
  value: string
): Promise<void> {
  await setConfigValue(configKey, value);
}

async function setConfigValue(configKey: string, value: any): Promise<void> {
  await atAllConfigScopes(addValueToConfigAtScope, configKey, value);
}

async function addValueToConfigAtScope(
  configKey: string,
  value: any,
  scope: vscode.ConfigurationTarget,
  valueAtScope: any,
  createIfNotExist: boolean
): Promise<void> {
  if (!createIfNotExist) {
    if (!valueAtScope || !valueAtScope[configKey]) {
      return;
    }
  }
  await vscode.workspace.getConfiguration().update(configKey, value, scope);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function addValueToConfigArray(
  configKey: string,
  value: string
): Promise<void> {
  await atAllConfigScopes(addValueToConfigArrayAtScope, configKey, value);
}

async function addValueToConfigArrayAtScope(
  configKey: string,
  value: string,
  scope: vscode.ConfigurationTarget,
  valueAtScope: any,
  createIfNotExist: boolean
): Promise<void> {
  if (!createIfNotExist) {
    if (!valueAtScope || !valueAtScope[configKey]) {
      return;
    }
  }

  let newValue: any = {};
  if (valueAtScope) {
    newValue = Object.assign({}, valueAtScope);
  }
  const arrayEntry: string[] = newValue[configKey] || [];
  arrayEntry.push(value);
  newValue[configKey] = arrayEntry;
  await vscode.workspace
    .getConfiguration()
    .update(EXTENSION_CONFIG_KEY, newValue, scope);
}

type ConfigUpdater<T> = (
  configKey: string,
  value: T,
  scope: vscode.ConfigurationTarget,
  valueAtScope: any,
  createIfNotExist: boolean
) => Promise<void>;

async function atAllConfigScopes<T>(
  fn: ConfigUpdater<T>,
  configKey: string,
  value: T
): Promise<void> {
  const config = vscode.workspace
    .getConfiguration()
    .inspect(EXTENSION_CONFIG_KEY)!;
  await fn(
    configKey,
    value,
    vscode.ConfigurationTarget.Global,
    config.globalValue,
    true
  );
  await fn(
    configKey,
    value,
    vscode.ConfigurationTarget.Workspace,
    config.workspaceValue,
    false
  );
  await fn(
    configKey,
    value,
    vscode.ConfigurationTarget.WorkspaceFolder,
    config.workspaceFolderValue,
    false
  );
}

//END -- Config set and update

export function toolPathOSKey(os: string, tool: string): string {
  const baseKey = toolPathBaseKey(tool);
  const osSpecificKey = osOverrideKey(os, baseKey);
  return osSpecificKey;
}

export function toolPathBaseKey(tool: string): string {
  return `${EXTENSION_CONFIG_KEY}.${tool}.cli.path`;
}

function osOverrideKey(os: string, baseKey: string): string {
  const osKey = osKeyString(os);
  return osKey ? `${baseKey}.${osKey}` : baseKey; // The 'else' clause should never happen so don't worry that this would result in double-checking a missing base key
}

function osKeyString(os: string): string | null {
  switch (os) {
    case 'win32':
    case 'windows':
      return 'windows';
    case 'darwin':
      return 'mac';
    case 'linux':
      return 'linux';
    default:
      return null;
  }
}

//Drone settings
export function getToolLocationFromConfig(os?: string, tool = 'drone'): string {
  //check if the setting has been overridden at OS level
  let toolLocation: string = vscode.workspace
    .getConfiguration()
    .get(toolPathOSKey(Platform.OS, tool));
  //if not then use the default setting
  if (!toolLocation) {
    toolLocation = vscode.workspace
      .getConfiguration()
      .get(toolPathBaseKey(tool));
  }
  return toolLocation;
}

const DRONE_CLI_CHECK_UPGRADE_KEY = `${EXTENSION_CONFIG_KEY}.drone.checkUpgrade`;

export function checkForDroneCliUpgrade(): boolean {
  return vscode.workspace.getConfiguration().get(DRONE_CLI_CHECK_UPGRADE_KEY);
}

const DRONE_RUN_ON_GIT_COMMIT_KEY = `${EXTENSION_CONFIG_KEY}.runOnGitCommit`;

export function isRunOnGitCommit(): boolean {
  return vscode.workspace.getConfiguration().get(DRONE_RUN_ON_GIT_COMMIT_KEY);
}

const DRONE_RUN_TRUSTED_KEY = `${EXTENSION_CONFIG_KEY}.runTrusted`;

export function isRunTrusted(): boolean {
  return vscode.workspace.getConfiguration().get(DRONE_RUN_TRUSTED_KEY);
}

const DRONE_EXEC_ENVIRONMENT_KEY = `${EXTENSION_CONFIG_KEY}.execEnvironment`;

export function getExecEnvironment(): object {
  return vscode.workspace.getConfiguration().get(DRONE_EXEC_ENVIRONMENT_KEY);
}

const DRONE_EXEC_SECRETS_KEY = `${EXTENSION_CONFIG_KEY}.execSecrets`;

export function getExecSecrets(): object {
  return vscode.workspace.getConfiguration().get(DRONE_EXEC_SECRETS_KEY);
}
