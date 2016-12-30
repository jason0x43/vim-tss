import { tmpdir } from 'os';
import { dirname, join, resolve } from 'path';
import { createHash } from 'crypto';
import { readdirSync, statSync } from 'fs';

export function getSocketFile(fileOrDir: string) {
	const hash = createHash('md5');
	hash.update(getProjectRoot(fileOrDir));
	return join(tmpdir(), `vim-tsserve.${hash.digest('hex')}.sock`);
}

function getProjectRoot(fileOrDir: string): string {
	const path = resolve(fileOrDir);

	const stats = statSync(path);
	if (!stats.isDirectory()) {
		return getProjectRoot(dirname(path));
	}

	const entries = readdirSync(path);
	if (entries.some(name => name === 'tsconfig.json')) {
		return path;
	}

	if (dirname(path) === path) {
		// We're at the filesystem root -- there's nowhere else to go
		throw new Error('Could not find a tsconfig.json');
	}

	return getProjectRoot(dirname(path));
}
