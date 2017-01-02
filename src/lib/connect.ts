import { tmpdir } from 'os';
import { dirname, join, resolve } from 'path';
import { createHash } from 'crypto';
import { readdirSync, statSync } from 'fs';
import { debug } from './log';

export function getSocketFile(fileOrDir: string) {
	const hash = createHash('md5');
	hash.update(getProjectConfig(fileOrDir));
	return join(tmpdir(), `vim-tsserve.${hash.digest('hex')}.sock`);
}

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
		throw new Error('Could not find a tsconfig.json or jsconfig.json');
	}

	return getProjectConfig(dirname(path));
}
