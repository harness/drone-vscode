/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Harness, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import * as YAML from 'yaml';

export function loadDoc(yamlFileContent: string): YAML.Document.Parsed<YAML.ParsedNode> {
  return YAML.parseDocument(yamlFileContent);
}

export function loadAndGetSteps(yamlFileContent: string): YAML.YAMLSeq<YAML.YAMLMap> | undefined{
  const yamlDoc = loadDoc(yamlFileContent);
  if (yamlDoc){
    return yamlDoc.get('steps') as YAML.YAMLSeq<YAML.YAMLMap>;
  }

  return;
}
  
export function getStepNames(steps: YAML.YAMLSeq<YAML.YAMLMap>): string[]{
  const stepNames = [];
  if (steps){
    steps.items.forEach(step =>{
      if (step){
        stepNames.push(step.get('name') as string);
      }
    });
  }
  return stepNames;
}
  
export function getStepImages(steps: YAML.YAMLSeq<YAML.YAMLMap>): Map<string,string>{
  const imageNames = new Map<string,string>;
  if (steps){
    steps.items.forEach(step =>{
      if (step){
        const key = step.get('name') as string;
        const value = step.get('image') as string;
        imageNames.set(key,value);
      }
    });
  }
  return imageNames;
}

    
