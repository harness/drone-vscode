/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Harness, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';
import { SpawnOptions, spawn } from 'child_process';
import * as stream from 'stream';
import * as events from 'events';

export interface CliExitData {
  readonly error: string | Error;
  readonly stdout: string;
}

export interface Cli {
  execute(cmd: CliCommand, opts?: SpawnOptions): Promise<CliExitData>;
  executeWatch(cmd: CliCommand, opts?: SpawnOptions): WatchProcess;
}

export interface DroneCliChannel {
  print(text: string, json?: boolean): void;
  show(): void;
}

export interface CliCommand {
  cliCommand: string;
  cliArguments: string[];
}

export interface WatchProcess extends events.EventEmitter {
  stdout: stream.Readable|null;
  stderr: stream.Readable|null;
  kill();
  readonly killed: boolean;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(event: string, listener: (...args: any[]) => void): this;
  on(event: 'error', listener: (err: Error) => void): this;
  on(event: 'close', listener: (code: number) => void): this;
}


export function createCliCommand(cliCommand: string, ...cliArguments: string[]): CliCommand {
  if (!cliArguments) {
    cliArguments = [];
  }
  return { cliCommand, cliArguments };
}

export function cliCommandToString(command: CliCommand): string {
  return `${command.cliCommand} ${command.cliArguments.join(' ')}`;
}

class DroneCliChannelImpl implements DroneCliChannel {
  private readonly channel: vscode.OutputChannel = vscode.window.createOutputChannel('Drone Pipelines');

  show(): void {
    this.channel.show();
  }

  prettifyJson(str: string): string {
    let jsonData: string;
    try {
      jsonData = JSON.stringify(JSON.parse(str), null, 2);
    } catch (ignore) {
      return str;
    }
    return jsonData;
  }

  print(text: string, json = false): void {
    const textData = json ? this.prettifyJson(text) : text;
    this.channel.append(textData);
    if (textData.charAt(textData.length - 1) !== '\n') {
      this.channel.append('\n');
    }
    if (vscode.workspace.getConfiguration('vs-tekton').get<boolean>('showChannelOnOutput')) {
      this.channel.show();
    }
  }
}

export class CliImpl implements Cli {

  private droneChannel: DroneCliChannel = new DroneCliChannelImpl();

  async showOutputChannel(): Promise<void> {
    this.droneChannel.show();
  }

  async execute(cmd: CliCommand, opts: SpawnOptions = {}): Promise<CliExitData> {
    return new Promise<CliExitData>((resolve) => {
      this.droneChannel.print(cliCommandToString(cmd));
      if (opts.windowsHide === undefined) {
        opts.windowsHide = true;
      }
      if (opts.shell === undefined) {
        opts.shell = true;
      }
      const drone = spawn(cmd.cliCommand, cmd.cliArguments, opts);
      let stdout = '';
      let error: string | Error;
      drone.stdout?.on('data', (data) => {
        stdout += data;
      });
      drone.stderr?.on('data', (data) => {
        error += data;
      });
      drone.on('error', err => {
        // do not reject it here, because caller in some cases need the error and the streams
        // to make a decision
        error = err;
      });
      drone.on('close', () => {
        resolve({ error, stdout });
      });
    });
  }

  executeWatch(cmd: CliCommand, opts: SpawnOptions = {}): WatchProcess {
    if (opts.windowsHide === undefined) {
      opts.windowsHide = true;
    }
    if (opts.shell === undefined) {
      opts.shell = true;
    }
    const commandProcess = spawn(cmd.cliCommand, cmd.cliArguments, opts);

    return commandProcess;
  }
}

export const cli = new CliImpl();

