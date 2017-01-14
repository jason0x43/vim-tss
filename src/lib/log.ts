/**
 * Simple logging system
 */

import { format } from 'util';
import { writeSync } from 'fs';

export function debug(...args: any[]) {
	return _debug(...args);
}

export function die(...args: any[]) {
	print(`${format(args[0], ...args.slice(1))}\n`);
	process.exit(1);
}

export function error(...args: any[]) {
	return log('Error:', ...args);
}

export function log(...args: any[]) {
	const time = new Date().toLocaleTimeString('en-US', { hour12: false });
	// Sync write to stderr
	writeSync(2, `${time} ${format(args[0], ...args.slice(1))}\n`);
}

export function print(message: Buffer | string) {
	if (typeof message !== 'string') {
		message = message.toString('utf8');
	}
	// Sync write to stdout
	writeSync(1, message);
}

let _debug = (..._args: any[]) => {};

if (process.env['VIM_TSS_LOG']) {
	const verbosity = Number(process.env['VIM_TSS_LOG']);
	if (verbosity > 0) {
		_debug = log;
	}
}
