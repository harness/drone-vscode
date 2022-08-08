/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Harness, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as fsex from 'fs-extra';
import * as _ from 'lodash';
import * as path from 'path';
import * as shell from 'shelljs';
import { failed } from '../../errorable';
import { NewInstaller as DroneCliInstaller } from '../../util/installDroneCli';
import {
  asGithubTag,
  asVersionNumber,
  cacheAndGetLatestRelease
} from '../../util/versionUtils';

suite('Install Drone CLI Test Suite', () => {
  const cacheDir = fsex.mkdtempSync(path.join(__dirname, 'version_utils'));
  const releaseCacheFile = path.join(cacheDir, 'drone-cli-releases.json');
  const owner = 'harness';
  const repo = 'drone-cli';
  const droneCliInstaller = DroneCliInstaller(cacheDir);
  let toolInstallLocation: string;

  test('Create Cache If Not Present', async () => {
    const result = await cacheAndGetLatestRelease(
      owner,
      repo,
      releaseCacheFile
    );
    assert.equal(
      result.succeeded,
      true,
      'Expecting cache to succeed but failed'
    );
    assert.equal(
      fsex.pathExistsSync(releaseCacheFile),
      true,
      'Expecting the release cache JSON file to be created'
    );
  });

  test('Ensure Cache File Is Reused', async () => {
    const cachedResult = await cacheAndGetLatestRelease(
      owner,
      repo,
      releaseCacheFile
    );

    assert.equal(
      fsex.pathExistsSync(releaseCacheFile),
      true,
      'Expecting the release cache JSON file to be created'
    );

    assert.equal(
      failed(cachedResult),
      false,
      'Expecting Cache Result to succeed'
    );

    if (!failed(cachedResult)) {
      assert.equal(
        cachedResult.result,
        'v1.5.0',
        `Expecting latest release to be "v1.5.0" but got ${cachedResult.result}`
      );
    }
  });

  test('Check If Cache Has version 1.5.0 ', async () => {
    const versionArray = await fsex.readJSON(releaseCacheFile, {
      encoding: 'utf-8',
    });
    //console.log(`Releases: ${versionArray}`);
    assert.equal(
      _.includes(versionArray, 'v1.5.0'),
      true,
      'Expecting releases to have version v1.5.0'
    );
  });

  test('Check Get Version Number from GitHub Tag ', () => {
    const versionNumber = asVersionNumber('v1.5.0');
    assert.equal(
      '1.5.0',
      versionNumber,
      `Expected "1.5.0" but got ${versionNumber}`
    );
  });

  test('Check Get Version Number as GitHub Tag ', () => {
    const ghTag = asGithubTag('1.5.0');
    assert.equal('v1.5.0', ghTag, `Expected "v1.5.0" but got ${ghTag}`);
  });

  test('Download latest Drone CLI', async () => {
    const installResult = await droneCliInstaller.installOrUpgradeDroneCli();
    if (!failed(installResult)) {
      assert.ok(
        fsex.existsSync(path.join(cacheDir, 'tools')),
        'Expected tools directory to have been created but its not created '
      );
      assert.ok(
        fsex.existsSync(path.join(cacheDir, 'tools', 'drone')),
        'Expecting drone cli to be have been downloaded but it does not exist'
      );
      const droneVersionCmd = `${droneCliInstaller.getToolLocation()} --version`;
      shell.config.execPath = shell.which('node').toString();
      const cmdExec = shell.exec(droneVersionCmd, { silent: true });
      assert.ok(cmdExec.code == 0, `Error running command ${droneVersionCmd}`);
      const versionOut = cmdExec.stdout.trim();
      assert.equal(
        versionOut,
        'drone version 1.5.0',
        'Expecting out put "drone version 1.5.0" but got ${versionOut}'
      );
      toolInstallLocation = installResult.result;
    } else {
      assert.fail(_.join(installResult.error, ' '));
    }
  });
  test('Do not Download If No Upgrade Available', async () => {
    const installResult = await droneCliInstaller.installOrUpgradeDroneCli();
    if (!failed(installResult)) {
      assert.equal(
        installResult.result,
        toolInstallLocation,
        `Expected drone cli install location to be ${toolInstallLocation} but got ${installResult.result}`
      );
    } else {
      assert.fail(_.join(installResult.error, ' '));
    }
  });
});
