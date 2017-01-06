/**
 * Utility functions for client scripts
 */

import { createConnection, Socket } from 'net';
import { MessageHandler, send } from './messages';
import { getProjectConfig, getSocketFile } from './connect';
import { readFile } from 'fs';
import { basename } from 'path';
import { die, print } from './log';

export interface FileLocation extends protocol.Location {
	file: string;
	text?: string;
}

export interface CompletionLocation extends protocol.Location {
	file: string;
	prefix?: string;
}

export interface RenameLocation extends protocol.Location {
	file: string;
	findInComments?: boolean;
	findInStrings?: boolean;
}

export class ProtocolError extends Error {
	command: string;
	requestSeq: number;

	constructor(response: protocol.Response) {
		const message = response.message || 'Request was not successful';

		super(message);
		Object.setPrototypeOf(this, ProtocolError.prototype);

		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, ProtocolError);
		}

		this.name = (<any>this).constructor.name;
		this.message = message;
		this.command = response.command;
		this.requestSeq = response.request_seq;
	}
}

export function closeFile(file: string) {
	return connect(file).then(() => {
		const request: protocol.CloseRequest = {
			seq: getSequence(),
			type: 'request',
			command: 'close',
			arguments: { file }
		};
		return sendRequest(request);
	});
}

export function completions(location: CompletionLocation) {
	return connect().then(() => {
		const request: protocol.CompletionsRequest = {
			seq: getSequence(),
			type: 'request',
			command: 'completions',
			arguments: location
		};
		return sendRequest<protocol.CompletionEntry[]>(request, (response, resolve) => {
			resolve(response.body);
		});
	});
}

export function configure(file: string = null) {
	if (!file) {
		file = getProjectConfig('.');
	}

	const formatOptions = new Promise((resolve, reject) => {
		readFile(file, (err, data) => {
			if (err) {
				reject(err);
			}
			else {
				const config = JSON.parse(data.toString('utf8'));
				resolve(config.formatCodeOptions);
			}
		});
	});

	return Promise.all([formatOptions, connect()]).then(results => {
		const [formatOptions] = results;
		const request: protocol.ConfigureRequest = {
			seq: getSequence(),
			type: 'request',
			command: 'configure',
			arguments: { formatOptions }
		};
		return sendRequest(request);
	});
}

export function definition(fileLocation: FileLocation) {
	return connect().then(() => {
		const request: protocol.DefinitionRequest = {
			seq: getSequence(),
			type: 'request',
			command: 'definition',
			arguments: fileLocation
		};
		return sendRequest<protocol.FileSpan[]>(request, (response, resolve) => {
			resolve(response.body);
		});
	});
}

/**
 * Close the client socket
 */
export function end() {
	if (client) {
		client.end();
	}
}

/**
 * Tell tsserver to exit gracefully
 */
export function exit() {
	return connect().then(() => {
		const request: protocol.ExitRequest = {
			seq: getSequence(),
			type: 'request',
			command: 'exit'
		};
		return sendRequest(request).then(end);
	});
}

/**
 * A file range
 */
export interface FileRange extends protocol.Location {
	endLine: number;
	endOffset: number;
}

export function getFileExtent(file: string) {
	return new Promise<FileRange>((resolve, reject) => {
		readFile(file, (err, data) => {
			if (err) {
				reject(err);
			}
			else {
				const endLine = data.reduce((count, item) => item === newline ? count + 1 : count, 0);
				const endOffset = data.length - data.lastIndexOf(newline);
				resolve({ line: 1, offset: 1, endLine, endOffset });
			}
		});
	});
}

export function failure(err: Error) {
	const response = { success: false, message: err.message };
	return print(`${JSON.stringify(response, null, '  ')}\n`);
}

export function format(file: string, fileExtent?: FileRange | Promise<FileRange>) {
	const range = fileExtent || getFileExtent(file);

	return Promise.all([range, connect()]).then(results => {
		const [range] = results;
		const request: protocol.FormatRequest = {
			seq: getSequence(),
			type: 'request',
			command: 'format',
			arguments: {
				line: range.line,
				offset: range.offset,
				endLine: range.endLine,
				endOffset: range.endOffset,
				file
			}
		};
		return sendRequest<protocol.CodeEdit[]>(request, (response, resolve) => {
			resolve(response.body);
		});
	});
}

export function getSemanticDiagnostics(file: string) {
	return connect(file).then(() => {
		const request: protocol.SemanticDiagnosticsSyncRequest = {
			seq: getSequence(),
			type: 'request',
			command: 'semanticDiagnosticsSync',
			arguments: { file }
		};
		return sendRequest<protocol.Diagnostic[]>(request, (response, resolve) => {
			resolve(response.body);
		});
	});
}

export function getSyntacticDiagnostics(file: string) {
	return connect(file).then(() => {
		const request: protocol.SyntacticDiagnosticsSyncRequest = {
			seq: getSequence(),
			type: 'request',
			command: 'syntacticDiagnosticsSync',
			arguments: { file }
		};
		return sendRequest<protocol.Diagnostic[]>(request, (response, resolve) => {
			resolve(response.body);
		});
	});
}

export function implementation(fileLocation: FileLocation) {
	return connect().then(() => {
		const request: protocol.ImplementationRequest = {
			seq: getSequence(),
			type: 'request',
			command: 'implementation',
			arguments: fileLocation
		};
		return sendRequest<protocol.FileSpan[]>(request, (response, resolve) => {
			resolve(response.body);
		});
	});
}

export function info(file: string) {
	return connect().then(() => {
		const request: protocol.ProjectInfoRequest = {
			seq: getSequence(),
			type: 'request',
			command: 'projectInfo',
			arguments: {
				file,
				needFileNameList: false
			}
		};
		return sendRequest<protocol.FileSpan[]>(request, (response, resolve) => {
			resolve(response.body);
		});
	});
}

export function openFile(file: string, data?: string) {
	return connect(file).then(() => {
		const args: protocol.OpenRequestArgs = { file };
		if (data != null) {
			args.fileContent = data;
		}
		const request: protocol.OpenRequest = {
			seq: getSequence(),
			type: 'request',
			command: 'open',
			arguments: args
		};
		return sendRequest(request).then(end);
	});
}

export function navBar(file: string) {
	return connect().then(() => {
		const request: protocol.NavBarRequest = {
			seq: getSequence(),
			type: 'request',
			command: 'navbar',
			arguments: { file }
		};
		return sendRequest<protocol.NavigationBarItem[]>(request, (response, resolve) => {
			resolve(response.body);
		});
	});
}

export function navTo(args: protocol.NavtoRequestArgs) {
	return connect().then(() => {
		const request: protocol.NavtoRequest = {
			seq: getSequence(),
			type: 'request',
			command: 'navto',
			arguments: args
		};
		return sendRequest<protocol.NavtoItem[]>(request, (response, resolve) => {
			resolve(response.body);
		});
	});
}

export function navTree(file: string) {
	return connect().then(() => {
		const request: protocol.NavTreeRequest = {
			seq: getSequence(),
			type: 'request',
			command: 'navtree',
			arguments: { file }
		};
		return sendRequest<protocol.NavTreeResponse>(request, (response, resolve) => {
			resolve(response.body);
		});
	});
}

export function parseFileArg(args?: string) {
	const file = process.argv[2];
	if (!file) {
		const command = basename(process.argv[1]);
		die(`usage: ${command} ${args || 'file'}`);
	}
	return file;
}

export function quickInfo(fileLocation: FileLocation) {
	return connect().then(() => {
		const request: protocol.QuickInfoRequest = {
			seq: getSequence(),
			type: 'request',
			command: 'quickinfo',
			arguments: fileLocation
		};
		return sendRequest<protocol.QuickInfoResponseBody>(request, (response, resolve) => {
			resolve(response.body);
		});
	});
}

export function success(value: any) {
	const response = { success: true, body: value };
	return print(`${JSON.stringify(response, null, '  ')}\n`);
}

export function references(fileLocation: FileLocation) {
	return connect().then(() => {
		const request: protocol.ReferencesRequest = {
			seq: getSequence(),
			type: 'request',
			command: 'references',
			arguments: fileLocation
		};
		return sendRequest<protocol.ReferencesResponseBody>(request, (response, resolve) => {
			resolve(response.body);
		});
	});
}

export function registerLogger() {
	return connect().then(() => {
		const request: LoggerRequest = {
			seq: getSequence(),
			type: 'request',
			command: 'logger'
		};
		return sendRequest(request);
	}).then(() => {
		return client;
	});
}

export function reloadFile(file: string, tmpfile?: string) {
	return connect(file).then(() => {
		const request: protocol.ReloadRequest = {
			seq: getSequence(),
			type: 'request',
			command: 'reload',
			arguments: {
				file,
				tmpfile: tmpfile || file
			}
		};
		return sendRequest<void>(request, (response, resolve) => {
			if (response.body && response.body['reloadFinished']) {
				resolve();
			}
		});
	});
}

export function reloadProjects() {
	return connect().then(() => {
		const request: protocol.ReloadProjectsRequest = {
			seq: getSequence(),
			type: 'request',
			command: 'reloadProjects'
		};
		// reloadProjects doesn't return anything
		return send(client, request);
	});
}

export function rename(location: RenameLocation) {
	return connect().then(() => {
		const request: protocol.RenameRequest = {
			seq: getSequence(),
			type: 'request',
			command: 'rename',
			arguments: location
		};
		return sendRequest<protocol.RenameResponseBody>(request, (response, resolve) => {
			resolve(response.body);
		});
	});
}

export function signatureHelp(location: FileLocation) {
	return connect().then(() => {
		const request: protocol.SignatureHelpRequest = {
			seq: getSequence(),
			type: 'request',
			command: 'signatureHelp',
			arguments: location
		};
		return sendRequest<protocol.SignatureHelpResponse>(request, (response, resolve) => {
			resolve(response.body);
		});
	});
}

export function typeDefinition(location: FileLocation) {
	return connect().then(() => {
		const request: protocol.TypeDefinitionRequest = {
			seq: getSequence(),
			type: 'request',
			command: 'typeDefinition',
			arguments: location
		};
		return sendRequest<protocol.TypeDefinitionResponse>(request, (response, resolve) => {
			resolve(response.body);
		});
	});
}

interface LoggerRequest extends protocol.Request {
	command: 'logger';
}

interface RequestCallback<T> {
	(response: protocol.Response, resolve: (value?: T) => void, reject: (error?: Error) => void): void;
}

const newline = 10;

let client: Socket;
let connected: Promise<Socket>;

function connect(file?: string) {
	if (!connected) {
		if (!file) {
			file = process.cwd();
		}

		connected = new Promise<Socket>((resolve, reject) => {
			const configFile = getProjectConfig(file);
			if (!configFile) {
				reject(new Error('No project config'));
				return;
			}

			client = createConnection(getSocketFile(configFile), () => {
				resolve(client);
			});

			client.on('error', error => {
				console.error('Error: ' + error.message);
			});

			client.on('close', hadError => {
				process.exit(hadError ? 1 : 0);
				client = null;
			});
		});
	}
	return connected;
}

function getSequence() {
	return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
}

function sendRequest<T>(request: protocol.Request, callback?: RequestCallback<T>): Promise<T> {
	return send(client, request).then(() => {
		if (!callback) {
			return;
		}

		function close() {
			handler.close();
		}

		const handler = new MessageHandler(client);
		const promise = new Promise<T>((resolve, reject) => {
			handler.on('response', response => {
				if (response.success === false) {
					reject(new ProtocolError(response));
				}
				else if (response.request_seq === request.seq) {
					callback(response, resolve, reject);
				}
			});
		});

		promise.then(close, close);

		return promise;
	});
}
