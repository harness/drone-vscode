/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Harness, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import * as fsex from 'fs-extra';
import { Octokit } from 'octokit';
import * as semver from 'semver';
import { Errorable, failed } from '../errorable';
import moment = require('moment');

const versionRe = new RegExp(/^[v]?([0-9]+\.[0-9]+\.[0-9]+[-\w]*)$/);
const stableVersionRe = new RegExp(/^[v]?([0-9]+\.[0-9]+\.[0-9]+)$/);

export class ToolVersionInfo {
  readonly currentVersion: string;
  readonly availableVersion: string;
}

export function asVersionNumber(versionText: string): string {
  const versionNumbers: RegExpExecArray = versionRe.exec(versionText);

  if (versionNumbers && versionNumbers.length > 1) {
    return versionNumbers[1];
  }

  return versionText;
}

export function asGithubTag(versionText: string): string {
  return `v${versionText}`;
}

export async function getStableReleases(
  owner: string,
  repo: string
): Promise<Errorable<string[]>> {
  try {
    const octokit = new Octokit();
    const { data } = await octokit.rest.repos.listReleases({
      owner: owner,
      repo: repo,
    });

    let stableReleases = data
      .map((r) => r.tag_name)
      .filter((tag) => stableVersionRe.test(tag));
    stableReleases = semver.rsort(stableReleases, { includePrerelease: false });
    return { succeeded: true, result: stableReleases };
  } catch (e: any) {
    return { succeeded: false, error: [e.message] };
  }
}

export async function cacheAndGetLatestRelease(
  owner: string,
  repo: string,
  releaseCacheFile: string
): Promise<Errorable<string>> {
  let releases: string[];
  const cacheExists = await fsex.pathExists(releaseCacheFile);
  if (cacheExists) {
    const stats = await fsex.stat(releaseCacheFile);
    //create or refresh cache
    if (refreshCache(stats)) {
      return await cacheAndGetRelease(releaseCacheFile, repo, owner);
    } else {
      releases = await fsex.readJSON(releaseCacheFile, {
        encoding: 'utf-8',
      });
    }
    return { succeeded: true, result: releases[0] };
  } else {
    await fsex.ensureFile(releaseCacheFile);
    return await cacheAndGetRelease(releaseCacheFile, repo, owner);
  }
}

async function cacheAndGetRelease(
  releaseCacheFile: string,
  repo: string,
  owner: string
): Promise<Errorable<string>> {
  const releasesResult = await getStableReleases(owner, repo);
  if (failed(releasesResult)) {
    return {
      succeeded: false,
      error: [
        `Failed to find ${owner}/${repo} stable version: ${releasesResult.error[0]}`,
      ],
    };
  }
  const releases = releasesResult.result;
  await fsex.writeFile(releaseCacheFile, JSON.stringify(releases));
  return { succeeded: true, result: releases[0] };
}

//Check if the file is 24 hours old
function refreshCache(stats: fsex.Stats): boolean {
  const modifiedTime = stats.mtimeMs;
  const days = moment().diff(moment(modifiedTime), 'days');
  return days > 1;
}
