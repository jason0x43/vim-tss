/**
 * Utility functions for client scripts
 */

import { createConnection, Socket } from 'net';
import { MessageHandler, send } from './messages';
import { getSocketFile } from './connect';

interface LoggerRequest extends protocol.Request {
	command: 'logger';
}

export function closeFile(filename: string) {
	return connect(filename).then(() => {
		const request: protocol.CloseRequest = {
			seq: getSequence(),
			type: 'request',
			command: 'close',
			arguments: { file: filename }
		};
		return sendRequest(request);
	});
}

export function end() {
	if (client) {
		client.end();
	}
}

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

export function getFile() {
	const filename = process.argv[2];
	if (!filename) {
		console.error('Error: A filename is required');
		process.exit(1);
	}
	return filename;
}

export function getSemanticDiagnostics(filename: string) {
	return connect(filename).then(() => {
		const request: protocol.SemanticDiagnosticsSyncRequest = {
			seq: getSequence(),
			type: 'request',
			command: 'semanticDiagnosticsSync',
			arguments: { file: filename }
		};
		return sendRequest<protocol.Diagnostic[]>(request, (response, resolve) => {
			resolve(response.body);
		});
	});
}

export function getSyntacticDiagnostics(filename: string) {
	return connect(filename).then(() => {
		const request: protocol.SyntacticDiagnosticsSyncRequest = {
			seq: getSequence(),
			type: 'request',
			command: 'syntacticDiagnosticsSync',
			arguments: { file: filename }
		};
		return sendRequest<protocol.Diagnostic[]>(request, (response, resolve) => {
			resolve(response.body);
		});
	});
}

export function openFile(filename: string) {
	return connect(filename).then(() => {
		const request: protocol.OpenRequest = {
			seq: getSequence(),
			type: 'request',
			command: 'open',
			arguments: { file: filename }
		};
		return sendRequest(request).then(end);
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

export function reloadFile(filename: string) {
	return connect(filename).then(() => {
		const request: protocol.ReloadRequest = {
			seq: getSequence(),
			type: 'request',
			command: 'reload',
			arguments: {
				file: filename,
				tmpfile: filename
			}
		};
		return sendRequest<void>(request, (response, resolve) => {
			if (response.body && response.body['reloadFinished']) {
				resolve();
			}
		});
	});
}

type RequestCallback<T> = (response: protocol.Response, resolve: (value?: T) => void, reject: (error?: Error) => void) => void;

let client: Socket;
let connected: Promise<Socket>;

function connect(filename?: string) {
	if (!connected) {
		if (!filename) {
			filename = process.cwd();
		}

		connected = new Promise<Socket>(resolve => {
			client = createConnection(getSocketFile(filename), () => {
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
					reject(new Error('Request was not successful'));
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
