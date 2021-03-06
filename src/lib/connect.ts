import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { createHash } from 'crypto';
import { debug } from './log';
import { randomBytes } from 'crypto';

export function getSocketFile(configFile: string) {
	const hash = createHash('md5');
	hash.update(resolve(configFile));
	return join(tmpdir(), `vim-tsserve.${hash.digest('hex')}.sock`);
}

/**
 * @param port A numeric port or socket file path
 * @param useTcp If this is true and if no port is provided or available in the
 *   environment, the auto-generated port will be a number rather than a path.
 */
export function getPort(port?: string | number, useTcp?: boolean) {
	if (port == null && process.env['VIM_TSS_PORT']) {
		debug('Using VIM_TSS_PORT from environment');
	}

	port = port || process.env['VIM_TSS_PORT'];

	// Environment variable may be empty
	if (port === '') {
		port = null;
	}

	if (port != null) {
		debug('Using provided port', port);

		const numericPort = Number(port);
		if (!isNaN(numericPort)) {
			// port was numeric, so return a number
			return numericPort;
		}
		// port wasn't a number, so return it directly
		return port;
	}

	if (useTcp) {
		// Return 0, which will cause Node to find an open TCP port
		debug('Returning default TCP port');
		return 0;
	}

	// Default behavior is to use a random socket file name
	debug('Returning random file port');
	const tag = randomBytes(20).toString('hex');
	return join(tmpdir(), `vim-tsserve.${tag}.sock`);
}
