/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Harness, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import * as fsex from 'fs-extra';
import * as path from 'path';
import * as semver from 'semver';
import { which } from 'shelljs';
import * as vscode from 'vscode';
import { cli, createCliCommand } from '../cli';
import { Errorable, failed, succeeded } from '../errorable';
import { Archive } from './archive';
import { DownloadUtil } from './download';
import { Platform } from './platform';
import {
  addPathToConfig, checkForDroneCliUpgrade, DRONE_CLI_COMMAND,
  EXTENSION_CONFIG_KEY, getToolLocation,
  toolPathBaseKey,
  toolPathOSKey
} from './settings';
import {
  asVersionNumber,
  cacheAndGetLatestRelease,
  ToolVersionInfo
} from './versionUtils';

interface InstallContext {
  installFolder: string;
  toolLocation: string;
}

export interface DroneCliInstaller {
  installOrUpgradeDroneCli(): Promise<Errorable<string>>;
  getToolLocation(): string;
}

export function NewInstaller(installFolder?: string): DroneCliInstaller {
  if (!installFolder) {
    installFolder = path.resolve(
      Platform.getUserHomePath(),
      `.${EXTENSION_CONFIG_KEY}`
    );
  }

  const toolLocation = getToolLocation(installFolder);

  return new DroneCliInstallerImpl({
    installFolder,
    toolLocation,
  });
}

class DroneCliInstallerImpl implements DroneCliInstaller {
  constructor(private readonly context: InstallContext) {
    this.context = context;
  }

  getToolLocation(): string {
    return path.join(this.context.toolLocation, DRONE_CLI_COMMAND);
  }

  async installOrUpgradeDroneCli(): Promise<Errorable<string>> {
    const whichLocation = which(DRONE_CLI_COMMAND);
    const toolLocations: string[] = [
      path.join(this.context.toolLocation, DRONE_CLI_COMMAND),
      whichLocation ? whichLocation.stdout : '',
    ];

    const result = await this.downloadAndInstallTool(toolLocations);
    if (result.succeeded) {
      const baseKey = toolPathBaseKey(DRONE_CLI_COMMAND);
      const osKey = toolPathOSKey(Platform.OS, DRONE_CLI_COMMAND);
      await addPathToConfig(baseKey, result.result);
      await addPathToConfig(osKey, result.result);
    }
    return result;
  }

  private async downloadAndInstallTool(
    locations: string[]
  ): Promise<Errorable<string>> {
    const os = Platform.OS;
    const arch = Platform.ARCH;
    let toolExists = false;
    let versionInfo: ToolVersionInfo;
    let toolLocation = '';
    for (const location of locations) {
      if (await fsex.pathExists(location)) {
        toolExists = true;
        toolLocation = location;
        versionInfo = await this.getToolVersionInfo(location);
        break;
      }
    }

    if (toolExists) {
      if (checkForDroneCliUpgrade()){
        const avblVersionNumber = asVersionNumber(versionInfo.availableVersion);
        const url = `https://github.com/harness/drone-cli/releases/download/${versionInfo.availableVersion}/drone_${os}_${arch}.tar.gz`;
        const isUpgradeNeeded = semver.lt(
          versionInfo.currentVersion,
          avblVersionNumber
        );
        if (isUpgradeNeeded) {
          const upgradeRequest = await vscode.window.showInformationMessage(
            `${DRONE_CLI_COMMAND}  upgrade available to ${versionInfo.availableVersion}, currently on ${versionInfo.currentVersion}`,
            'Install'
          );
          if (upgradeRequest === 'Install') {
            await this.installTool(url, avblVersionNumber);
          }
        }
        return {
          succeeded: true,
          result: toolLocation,
        };
      }
    } else {
      const versionResult = await this.getStableDroneVersion();
      if (succeeded(versionResult)) {
        const latestVersion = versionResult.result;
        const url = `https://github.com/harness/drone-cli/releases/download/${latestVersion}/drone_${os}_${arch}.tar.gz`;
        await this.installTool(url, latestVersion);
        toolLocation = this.context.toolLocation;
      } else {
        vscode.window.showErrorMessage(
          `Error downloading Drone CLI ${versionResult.error}`
        );
      }
      return {
        succeeded: true,
        result: path.join(toolLocation, DRONE_CLI_COMMAND),
      };
    }
  }

  private async installTool(url: string, version: string): Promise<void> {
    const toolLocation = this.context.toolLocation;
    const toolArchiveFile = path.join(
      this.context.installFolder,
      'drone-cli.tar.gz'
    );
    await fsex.ensureDir(this.context.installFolder);

    await vscode.window.withProgress(
      {
        cancellable: true,
        location: vscode.ProgressLocation.Notification,
        title: `Downloading Drone cli version ${version}`,
      },
      (progress: vscode.Progress<{ increment: number; message: string }>) =>
        DownloadUtil.downloadFile(
          url,
          toolArchiveFile,
          (dlProgress, increment) =>
            progress.report({ increment, message: `${dlProgress}%` })
        )
    );

    await Archive.unzip(toolArchiveFile, toolLocation, '');
    await fsex.remove(toolArchiveFile);
  }

  private async getStableDroneVersion(): Promise<Errorable<string>> {
    const toolReleasesFile = path.join(
      this.context.installFolder,
      'drone-cli-releases.json'
    );
    const releaseCacheFile = `${toolReleasesFile}`;
    const releaseResult = await cacheAndGetLatestRelease(
      'harness',
      'drone-cli',
      releaseCacheFile
    );

    if (failed(releaseResult)) {
      return { succeeded: false, error: releaseResult.error };
    }

    return { succeeded: true, result: releaseResult.result };
  }

  async getToolVersionInfo(
    toolLocation: string
  ): Promise<ToolVersionInfo | undefined> {
    let currentVersion: string;
    let availableVersion: string;

    const version = new RegExp(
      /^drone\s*version\s*.*([0-9]+\.[0-9]+\.[0-9]+?[-\w]*).*$/
    );
    const sr = await cli.execute(createCliCommand(toolLocation, ' --version'));

    if (sr.error) {
      throw new Error(
        `Error checking for drone updates: ${
          sr ? sr.error : 'cannot run drone'
        }`
      );
    }

    const lines = sr.stdout
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    const toolVersion: string = version.exec(lines[0])[1];
    if (toolVersion.length) {
      currentVersion = toolVersion;
    }

    const versionRes = await this.getStableDroneVersion();

    if (failed(versionRes)) {
      vscode.window.showErrorMessage(
        `Failed to determine drone cli version: ${versionRes.error}`
      );
      return;
    }

    if (currentVersion === null || availableVersion === null) {
      throw new Error(
        `Unable to get version from drone cli version check: ${lines}`
      );
    }

    return {
      currentVersion: currentVersion,
      availableVersion: versionRes.result,
    } as ToolVersionInfo;
  }
}
