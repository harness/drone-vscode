/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Harness, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import * as _ from 'lodash';
import { searchPluginsByNameOrTags } from '../../plugins/pluginApi';

suite('Server Test Suite',()=>{

  test('Should Get Plugins that has name \'java\'', async () =>{
    const dronePlugins = await searchPluginsByNameOrTags('java');
    assert.ok(dronePlugins.length > 0 ,'Expecting atleast one plugin but got none');
    const pluginName = _.map(dronePlugins,['id','java-maven']);
    assert.ok(pluginName,'Expecting the list to have "java-maven-plugin" but its not found');
  });

  test('Should Get Plugins that has name or  Tag \'java\' or \'docker\' ', async () =>{
    const dronePlugins = await searchPluginsByNameOrTags('java','docker');
	
    assert.ok(dronePlugins.length > 0 ,'Expecting at least one plugin but got none');

    let dronePlugin = _.find(dronePlugins,{'id': 'java-maven'});
	
    assert.ok(dronePlugin,'Expecting the list to have "java-maven-plugin" but its not found');

    dronePlugin = _.find(dronePlugins,{'id': 'buildah'});
    assert.ok(dronePlugin,'Expecting the list to have "buildah" as well but its not found');

    dronePlugin = _.find(dronePlugins,['id','airbrake-deployment']);
    assert.ok(!dronePlugin,'Expecting the list not to have "airbrake-deployment" but its part of the list');
  });

  test('There should not any plugin by name or tag as \'@\' ', async () =>{
    const dronePlugins = await searchPluginsByNameOrTags('@');
    assert.ok(dronePlugins.length == 0,'Expect no plugins but got few');
  });

}); 
