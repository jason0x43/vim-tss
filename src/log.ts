/**
 * Display requests and responses for the current project's tsserver
 */

import { connect, registerLogger } from './lib/client';
import { die } from './lib/log';
import { parseArgs } from './lib/opts';

const { port } = parseArgs();

connect(port).then(() => registerLogger()).then(client => {
	client.on('data', data => {
		process.stdout.write(data);
	});

	client.on('error', error => {
		die('Error: ' + error.message);
	});

	client.on('close', () => {
		process.exit(0);
	});
});
