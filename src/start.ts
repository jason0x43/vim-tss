/**
 * Start a tsserver proxy that will manage a running instance of tsserver
 */

import { ChildProcess, execSync, spawn } from 'child_process';
import { createServer, Socket } from 'net';
import { join } from 'path';
import { statSync, unlink } from 'fs';
import { debug, error, log, print } from './lib/log';
import { MessageHandler } from './lib/messages';
import { getProjectConfig, getSocketFile } from './lib/connect';
import { configure } from './lib/client';

function commandExists(command: string) {
	try {
		const checker = process.platform === 'win32' ? 'where' : 'command -v';
		execSync(`${checker} ${command}`);
		return true;
	}
	catch (err) {
		debug(`Error checking for command: ${err}`);
		return false;
	}
}

function fileExists(filename: string) {
	try {
		statSync(filename);
		return true;
	}
	catch (err) {
		return false;
	}
}

function findServerBin() {
	let serverBin = process.argv[2];
	if (fileExists(serverBin)) {
		return serverBin;
	}

	// Try project
	serverBin = join('node_modules', '.bin', 'tsserver');
	debug(`Trying local tsserver at ${serverBin}`);
	if (fileExists(serverBin)) {
		return serverBin;
	}

	// Try global
	serverBin = 'tsserver';
	debug('Trying global tsserver');
	if (!commandExists(serverBin)) {
		return serverBin;
	}

	// Try plugin
	serverBin = join(__dirname, '..', 'node_modules', '.bin', 'tsserver');
	debug(`Trying plugin tsserver at ${serverBin}`);
	if (fileExists(serverBin)) {
		return serverBin;
	}
}

function startTsserver() {
	tsserver = spawn(serverBin);
	log('Started tsserver');

	// Pipe this process's stdin to the running tsserver's
	process.stdin.pipe(tsserver.stdin);

	tsserver.on('exit', function () {
		debug('Server exited');

		// If tsserver is exiting because the user asked it to, this process
		// should also end
		if (exiting) {
			process.exit(0);
		}
		else {
			tsserver.removeAllListeners();
			tsserver = null;

			// Respawn the server
			startTsserver();
		}
	});

	tsserver.on('error', err => {
		error(`Server error: ${err}`);
	});

	tsserver.stdout.on('data', data => {
		print(data);
		clients.forEach(client => client.write(data));
	});

	tsserver.stderr.on('data', (data: Buffer) => {
		log(data.toString('utf8'));
	});

	// configure the newly created server
	configure().catch(error);
}

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

process.on('exit', () => {
	if (!alreadyRunning) {
		if (tsserver) {
			tsserver.kill();
		}
		// Ensure socket file is removed when process exits
		if (socketFile) {
			unlink(socketFile, _err => {});
		}
	}
});

let exiting = false;
let alreadyRunning = false;
let tsserver: ChildProcess;

const serverBin = findServerBin();
if (!serverBin) {
	error(`Couldn't find a copy of tsserver`);
	process.exit(1);
}

const configFile = getProjectConfig(process.cwd());
if (!configFile) {
	error('Could not find a config file');
	process.exit(1);
}

const socketFile = getSocketFile(configFile);
const clients: Socket[] = [];
const loggers: Socket[] = [];

const server = createServer(client => {
	debug('Added client');
	clients.push(client);

	const clientHandler = new MessageHandler(client);

	clientHandler.on('request', request => {
		debug('Received request', request);

		switch (request.command) {
		case 'exit':
			exiting = true;
			break;
		case 'logger':
			loggers.push(client);
			debug('Added logger');
			return;
		}

		const message = `${JSON.stringify(request)}\n`;
		tsserver.stdin.write(message);
		loggers.forEach(logger => {
			logger.write(message);
		});
	});

	client.on('end', () => {
		clients.splice(clients.indexOf(client), 1);
		debug('Removed client');

		const logger = loggers.indexOf(client);
		if (logger !== -1) {
			loggers.splice(logger, 1);
			debug('Removed logger');
		}
	});

	client.on('error', err => {
		error(`Client error: ${err}`);
	});
});

server.on('error', (err: NodeJS.ErrnoException) => {
	if (err.code === 'EADDRINUSE') {
		debug(`Server is already running`);
		log(`Listening on ${socketFile}...`);
		alreadyRunning = true;
		process.exit(0);
	}
	else {
		error(`Error: ${err}`);
		process.exit(1);
	}
});

server.listen(socketFile, () => {
	startTsserver();
	log(`Listening on ${socketFile}...`);
});
