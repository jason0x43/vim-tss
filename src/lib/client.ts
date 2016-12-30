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
		return sendRequest(<protocol.CloseRequest> {
			command: 'close',
			arguments: { file: filename },
			type: 'request'
		});
	});
}

export function end() {
	if (client) {
		client.end();
	}
}

export function exit() {
	return connect().then(() => {
		return sendRequest(<protocol.ExitRequest> {
			command: 'exit',
			type: 'request'
		}).then(end);
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
		return sendRequest<protocol.Diagnostic[]>(<protocol.SemanticDiagnosticsSyncRequest> {
			command: 'semanticDiagnosticsSync',
			arguments: { file: filename },
			type: 'request'
		}, (response, resolve) => {
			resolve(response.body);
		});
	});
}

export function getSyntacticDiagnostics(filename: string) {
	return connect(filename).then(() => {
		return sendRequest<protocol.Diagnostic[]>(<protocol.SyntacticDiagnosticsSyncRequest> {
			command: 'syntacticDiagnosticsSync',
			arguments: { file: filename },
			type: 'request'
		}, (response, resolve) => {
			resolve(response.body);
		});
	});
}

export function openFile(filename: string) {
	return connect(filename).then(() => {
		return sendRequest(<protocol.OpenRequest> {
			command: 'open',
			arguments: { file: filename },
			type: 'request'
		}).then(end);
	});
}

export function registerLogger() {
	return connect().then(() => {
		return sendRequest(<LoggerRequest> {
			command: 'logger',
			type: 'request'
		});
	}).then(() => {
		return client;
	});
}

export function reloadFile(filename: string) {
	return connect(filename).then(() => {
		return sendRequest<void>(<protocol.ReloadRequest> {
			command: 'reload',
			arguments: {
				file: filename,
				tmpfile: filename
			}
		}, (response, resolve) => {
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

function sendRequest<T>(request: protocol.Request, callback?: RequestCallback<T>): Promise<T> {
	request.seq = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
	request.type = 'request';

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
