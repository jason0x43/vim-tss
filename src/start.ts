/**
 * Start a tsserver proxy that will manage a running instance of tsserver
 */

import { ChildProcess, execSync, spawn } from 'child_process';
import { createServer, Socket } from 'net';
import { join } from 'path';
import { unlink } from 'fs';
import { debug, error, log, print } from './lib/log';
import { MessageHandler } from './lib/messages';
import { parseArgs } from './lib/opts';
import { fileExists } from './lib/util';
import { getPort } from './lib/connect';

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
	if (commandExists(serverBin)) {
		return serverBin;
	}

	// Try plugin
	serverBin = join(__dirname, '..', 'node_modules', '.bin', 'tsserver');
	debug(`Trying plugin tsserver at ${serverBin}`);
	if (fileExists(serverBin)) {
		return serverBin;
	}
}

function runAsDaemon() {
	// This process is a daemon, so don't do anything else
	if (process.env['__VIM_TSS_DAEMON__']) {
		return;
	}

	// the child process will have this set so we can identify it as being daemonized
	process.env['__VIM_TSS_DAEMON__'] = 1;

	// start ourselves as a daemon
	const child = spawn(process.execPath, process.argv.slice(1), {
		stdio: [ 'ignore', 'ignore', 'ignore', 'ipc' ],
		detached: true
	});

	// Wait for a message from the child with the port its running on, then exit
	child.on('message', data => {
		print(`VIM_TSS_PORT=${data.port}\n`);

		// required so the parent can exit
		child.unref();

		process.exit(0);
	});

	// Wait for a message from the child with the port its running on, then exit
	child.on('error', err => {
		error(err);
	});

	child.on('exit', code => {
		print(`Child exited with ${code}\n`);
	});

	return child.pid;
}

function startTsserver() {
	if (debugTsserver) {
		tsserver = spawn('node', ['--inspect', '--debug-brk', serverBin]);
	}
	else {
		tsserver = spawn(serverBin);
	}
	log('Started tsserver');

	tsserver.on('exit', function () {
		// If tsserver is exiting because the user asked it to, this process
		// should also end
		if (exiting) {
			log('Exiting at user request');
			process.exit(0);
		}
		else {
			log('Server stopped; restarting');

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
}

let tsserver: ChildProcess;
const clients: Socket[] = [];
let exiting = false;
let serverBin: string;

const { flags, port: portArg } = parseArgs({
	flags: {
		// Run the server as a background process
		daemon: 'd',

		// Run the server in debug mode
		'debug-tsserver': true,

		// Use a file socket by default
		'tcp': 't'
	}
});

let debugTsserver = flags['debug-tsserver'];
let daemonize = flags['daemon'];
let port = getPort(portArg, flags['tcp']);

// If this is a daemon, processing will continue from here. If not, this
// process will start a daemon and exit.
let daemon: number;
if (daemonize) {
	daemon = runAsDaemon();
}

if (daemon == null) {
	process.on('SIGINT', () => process.exit(0));
	process.on('SIGTERM', () => process.exit(0));

	process.on('exit', () => {
		if (tsserver) {
			tsserver.kill();
		}
		// Ensure socket file is removed when process exits
		if (typeof port === 'string') {
			unlink(port, _err => {});
		}
	});

	serverBin = findServerBin();
	if (!serverBin) {
		error(`Couldn't find a copy of tsserver`);
		process.exit(1);
	}

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
		error(`Error: ${err}`);
		process.exit(1);
	});

	server.listen(port, () => {
		// If port was 0, server will have auto-assigned a port
		if (port === 0) {
			port = server.address().port;
		}

		if (daemonize) {
			process.send({ port });
		}

		startTsserver();
		log(`Listening on port ${port}...`);
		print(`VIM_TSS_PORT=${port}\n`);
	});
}
