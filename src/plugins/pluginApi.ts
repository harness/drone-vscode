/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Harness, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import * as fsex from 'fs-extra';
import * as _ from 'lodash';
import * as path from 'path';
import { Platform } from '../util/platform';
import { getInstallFolder } from '../util/settings';
import * as moment from 'moment';
import { Errorable, failed } from '../errorable';
import * as axios from 'axios';

export interface DronePluginSettings{
	title: string
	description: string
	required: boolean
	secret: boolean
	defaultValue: any,
	type: string
}

export interface DronePlugin {
	id: string
	name: string
	description: string
	image:string
	tags: string
	settings: DronePluginSettings[]
	example: string
	url: string
}

export async function searchPluginsByNameOrTags(...searchTerms): Promise<DronePlugin[]>{
  let matchedPlugins = new Array<DronePlugin>;
  let dronePlugins = new Array<DronePlugin>();

  const homePath = Platform.getUserHomePath();
  if (homePath){
    const pluginsCacheFile = path.join(getInstallFolder(),'plugins','plugins.json');

    const pluginsFileExists = await fsex.pathExists(pluginsCacheFile);

    let pluginCacheResult:Errorable<any>;
    
    if (!pluginsFileExists){
      await fsex.ensureFile(pluginsCacheFile);
      pluginCacheResult = await getAndCachePlugins(pluginsCacheFile);
    } else {
      const stats = await fsex.stat(pluginsCacheFile);
      if (refreshCache(stats)){
        await fsex.remove(pluginsCacheFile);
        pluginCacheResult = await getAndCachePlugins(pluginsCacheFile);
      } else {
        pluginCacheResult = { succeeded: true, result: await fsex.readJSON(pluginsCacheFile) };
      }
    }

    if (failed(pluginCacheResult)){
      const cacheReq = await vscode.window.showErrorMessage('Error caching plugins data','OK','Try again');
      do {
        pluginCacheResult = await getAndCachePlugins(pluginsCacheFile);
      } while (cacheReq === 'Try again'); 
      return [];
    } 
    
    dronePlugins = pluginCacheResult.result;
  
    if (searchTerms && searchTerms.length > 0){
      matchedPlugins = _.filter(dronePlugins, (o) =>{
        let isMatched = false;
        searchTerms.forEach( t =>{
          const regExp = new RegExp('^.*' + t + '.*$','i');
          const tagMatches = _.some(o.tags, _.method('match',regExp));
          isMatched = isMatched || tagMatches || regExp.test(o.name);
        });
        return isMatched;
      });
    } else {
      return dronePlugins;
    }
  }
  
  return matchedPlugins;
}

async function getAndCachePlugins(releaseCacheFile: string
): Promise<Errorable<any>> {
  try {
    const res = await axios.default
      .get('https://plugins.drone.io/api/plugins');
    await fsex.writeJson(releaseCacheFile, res.data);
    return { succeeded: true, result: res.data };
  } catch (e){
    return {
      succeeded: false,
      error: [
        `Failed to cache plugins info : ${e}`,
      ],
    };
  }
}

//Check if the file is 1 hour old
function refreshCache(stats: fsex.Stats): boolean {
  const modifiedTime = stats.mtimeMs;
  const days = moment().diff(moment(modifiedTime),'hour');
  return days > 1;
}
