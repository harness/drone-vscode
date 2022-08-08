/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Harness, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as fsex from 'fs-extra';
import * as glob from 'glob';
import * as Mocha from 'mocha';
import * as path from 'path';
import * as shell from 'shelljs';

export function run(): Promise<void> {

  let srcDroneCli; // the  path of any existing drone
  let targetDroneCli; // the backup path of the drone
  
  // Create the mocha test
  const mocha = new Mocha({
    ui: 'tdd',
    color: true,
    timeout: 0,
    rootHooks: {
      beforeAll: () =>{
        const droneCli = shell.which('drone');
        if (droneCli) {
          srcDroneCli = droneCli.toString();
          if (srcDroneCli){
            targetDroneCli = path.join(path.dirname(srcDroneCli),'drone.bkup');
            fsex.moveSync(srcDroneCli,targetDroneCli);
          }
        }
      },
      afterAll: () =>{
        if (srcDroneCli && targetDroneCli){
          fsex.moveSync(targetDroneCli,srcDroneCli);
        }
      }
    },
  });

  const testsRoot = path.resolve(__dirname, '..');

  return new Promise((c, e) => {
    glob('**/**.test.js', { cwd: testsRoot }, (err, files) => {
      if (err) {
        return e(err);
      }

      // Add files to the test suite
      files.forEach((f) => mocha.addFile(path.resolve(testsRoot, f)));
      try {
        // Run the mocha test
        mocha.run((failures) => {
          if (failures > 0) {
            e(new Error(`${failures} tests failed.`));
          } else {
            c();
          }
        });
      } catch (err) {
        console.error(err);
        e(err);
      }
    });
  });
}
