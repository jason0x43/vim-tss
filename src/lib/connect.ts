import { tmpdir } from 'os';
import { dirname, join, resolve } from 'path';
import { createHash } from 'crypto';
import { readdirSync, statSync } from 'fs';
import { debug } from './log';
import { randomBytes } from 'crypto';

export function getProjectConfig(fileOrDir: string): string {
	debug(`Checking for config in ${fileOrDir}`);

	const path = resolve(fileOrDir);

	const stats = statSync(path);
	if (!stats.isDirectory()) {
		return getProjectConfig(dirname(path));
	}

	for (let filename of readdirSync(path)) {
		debug(`Considering ${filename}`);
		if ((filename === 'tsconfig.json' || filename === 'jsconfig.json')) {
			return join(path, filename);
		}
	}

	if (dirname(path) === path) {
		// We're at the filesystem root -- there's nowhere else to go
		return null;
	}

	return getProjectConfig(dirname(path));
}

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

	if (port != null) {
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
		return 0;
	}

	// Default behavior is to use a random socket file name
	const tag = randomBytes(20).toString('hex');
	return join(tmpdir(), `vim-tsserve.${tag}.sock`);
}
