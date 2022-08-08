/* eslint-disable header/header */

//https://github.com/redhat-developers/vscode-tekton

/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

'use strict';

export class Platform {
  static identify(map): string | undefined {
    if (map[Platform.OS]) {
      return map[Platform.OS]();
    }
    return map['default'] ? map['default']() : undefined;
  }

  static getOS(): string {
    return process.platform;
  }

  static getArch(): string {
    return process.arch;
  }

  static get OS(): string {
    return Platform.getOS();
  }

  static get ENV(): NodeJS.ProcessEnv {
    return Platform.getEnv();
  }

  static get ARCH(): string {
    return Platform.getArch();
  }

  static getEnv(): NodeJS.ProcessEnv {
    return process.env;
  }

  static getUserHomePath(): string | undefined {
    return Platform.identify({
      win32: () => Platform.ENV.USERPROFILE,
      default: () => Platform.ENV.HOME,
    });
  }
}
