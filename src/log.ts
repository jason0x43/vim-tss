/**
 * Display requests and responses for the current project's tsserver
 */

import { registerLogger } from './lib/client';
import { die } from './lib/log';

registerLogger().then(client => {
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
