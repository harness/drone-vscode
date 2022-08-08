/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Harness, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import * as _ from 'lodash';
import { getStepNames, loadAndGetSteps } from '../util/pipelineYamlUtils';
import { DroneCli } from '../drone';
import * as fsex from 'fs-extra';

export async function runStep(droneCli: DroneCli): Promise<void>{
  const editor = vscode.window.activeTextEditor;

  if (editor){
    const document = editor.document;
    try {
      const pipelineSteps = loadAndGetSteps(document.getText());
      const step = document.getText(editor.selection);
      //TODO check if the selection range includes `name:`
      let toRunSteps = _.intersection(getStepNames(pipelineSteps),[step]);
      if (toRunSteps && toRunSteps.length > 0){
        toRunSteps = _.map(toRunSteps,(item => `--include=${item}`));
        droneCli.exec(...toRunSteps);
      } else {
        vscode.window.showInformationMessage(`Pipeline step ${step} does not exist, have selected the complete step name ?`);
      }
    } catch (e:any){
      vscode.window.showErrorMessage(`Error running pipeline steps ${e}`);
    }
  }
}

export async function runSteps(droneCli: DroneCli): Promise<void>{
  const editor = vscode.window.activeTextEditor;
  let pipelineYAML:string;
  try {
    if (editor){
      const document = editor.document;
      pipelineYAML = document.getText();
    
    } else {
      //make sure we get the right context
      if (!droneCli.getContext().droneFile){
        await droneCli.refreshContext();
      }
      pipelineYAML = (await fsex.readFile(droneCli.getContext().droneFile.fsPath)).toString();
    }

    const pipelineSteps = loadAndGetSteps(pipelineYAML);
    const pipelineStepNames = getStepNames(pipelineSteps); 
    
    const selectedSteps = await vscode.window.showQuickPick(pipelineStepNames,{
      canPickMany: true,
      title:'Select Pipeline Steps to Run',
      ignoreFocusOut: true
    });

    if (selectedSteps && selectedSteps.length > 0) {
      let toRunSteps = _.intersection(pipelineStepNames,selectedSteps);
      if (toRunSteps && toRunSteps.length > 0){
        toRunSteps = _.map(toRunSteps,(item => `--include=${item}`));
        droneCli.exec(...toRunSteps);
      }
    } else {
      vscode.window.showInformationMessage('No steps selected to run');
    }
  } catch (e:any){
    vscode.window.showErrorMessage(`Error running pipeline steps ${e}`);
  }
}
