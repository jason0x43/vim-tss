import { registerLogger } from './lib/client';

registerLogger().then(client => {
	client.on('data', data => {
		process.stdout.write(data);
	});

	client.on('error', error => {
		console.error('Error: ' + error.message);
		process.exit(1);
	});

	client.on('close', () => {
		process.exit(0);
	});
});
