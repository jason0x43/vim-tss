/**
 * Simple logging system
 */

import { format } from 'util';

export function debug(...args: any[]) {
	_debug(...args);
}

export function die(...args: any[]) {
	error(...args);
	process.exit(1);
}

export function error(...args: any[]) {
	log(...args);
}

export function log(...args: any[]) {
	const time = new Date().toLocaleTimeString('en-US', { hour12: false });
	process.stderr.write(`${time} ${format.apply(null, args)}\n`);
}

export function print(message: Buffer | string) {
	if (typeof message !== 'string') {
		message = message.toString('utf8');
	}
	process.stdout.write(<string> message);
}

let _debug = (..._args: any[]) => {};

if (process.env['VIM_TSS_LOG']) {
	const verbosity = Number(process.env['VIM_TSS_LOG']);
	if (verbosity > 0) {
		_debug = log;
	}
}
