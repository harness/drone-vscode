/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Harness, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { getStepImages, getStepNames, loadAndGetSteps, loadDoc } from '../../util/pipelineYamlUtils';
import * as _ from 'lodash';
import { MAP } from 'yaml/dist/nodes/Node';


const NO_STEPS_YAML = `kind: pipeline
type: docker
name: no-steps
steps:
`;

const PIPELINE_YAML = `kind: pipeline
type: docker
name: greeter
platform:
  os: linux
  arch: arm64
steps: 
  - name: hello-world
    image: busybox
    commands:
    - echo 'Hello World'
  - name: test-world
    image: ubuntu
    commands:
    - echo 'Test World'
  - name: good-bye-world
    image: alpine
    commands:
    - echo 'Test World'
  - name: my-step
    image: fedora
    commands:
     - echo 'It works!'
`;

suite('Pipeline YAML Utils Test Suite',() =>{
  test('Load pipeline YAML',() =>{
    const yamlDoc = loadDoc(PIPELINE_YAML);
    assert.ok(yamlDoc,'Expect to load the YAML Doc successfully, but document is null');
    const pipelineName = yamlDoc.get('name');
    assert.equal(pipelineName,'greeter',`Name of the pipeline should be "greeter" but it is ${pipelineName}`);
  });
  test('Get all step names from the pipeline' ,() =>{
    const steps = loadAndGetSteps(PIPELINE_YAML);
    assert.ok(steps,'Expecting steps to be available');
    assert.ok(steps.items.length > 0 ,'Expecting the pipeline to have steps but got none');
    const stepNames = getStepNames(steps);
    assert.ok(_.isEqual(stepNames.sort(),['test-world','my-step','hello-world','good-bye-world'].sort()));
  });

  test('Get all step and its images from the pipeline' ,() =>{
    const expected = new Map<string,string>;
    expected.set('hello-world','busybox');
    expected.set('test-world','ubuntu');
    expected.set('good-bye-world','alpine');
    expected.set('my-step','fedora');
    const steps = loadAndGetSteps(PIPELINE_YAML);
    assert.ok(steps,'Expecting steps to be available');
    assert.ok(steps.items.length > 0 ,'Expecting the pipeline to have steps but got none');
    const stepImages = getStepImages(steps);
    assert.ok(stepImages.values.length == 0 ,`Expecting the each step to have an image but found ${stepImages}`);
    assert.ok(_.isEqual(stepImages,expected),`Expecting ${expected} but got ${stepImages}`);
  });

  test('Should not have any steps',() =>{
    const noSteps = loadAndGetSteps(NO_STEPS_YAML);
    assert.ok(!noSteps,`Expecting no steps but got ${noSteps}`);
  });
});
