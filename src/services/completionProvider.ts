/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Harness, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { searchPluginsByNameOrTags } from '../plugins/pluginApi';

export async function providerDroneCompletions(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.CompletionItem[]>{
  console.log('Jai Guru::Provide completions');
  const completions = new Array<vscode.CompletionItem>();

  // get all text until the `position`
  // TODO if its empty line check previous 
  const linePrefix = document.lineAt(position).text.trim();

  if (!linePrefix.endsWith('steps:')) {
    return undefined;
  }
  
  //TODO optimise 
  const dronePlugins = await searchPluginsByNameOrTags();
  
  switch (linePrefix) {
    case 'steps:':{
      dronePlugins.forEach(p => {
        //TODO right kind of completion
        const ci = new vscode.CompletionItem(p.name);
        completions.push(ci);
      });
      break;
    }
    case '-':{
      
      break;
    }
    default:
      break;
  }
                
  return completions;
}
