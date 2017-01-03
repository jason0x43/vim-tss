/**
 * Simple logging system
 */

import { format } from 'util';

export function debug(...args: any[]) {
	return _debug(...args);
}

export function die(...args: any[]) {
	error(...args).then(() => {
		process.exit(1);
	});
}

export function error(...args: any[]) {
	return log(...args);
}

export function log(...args: any[]) {
	const time = new Date().toLocaleTimeString('en-US', { hour12: false });
	return new Promise(resolve => {
		process.stderr.write(`${time} ${format.apply(null, args)}\n`, resolve);
	});
}

export function print(message: Buffer | string) {
	if (typeof message !== 'string') {
		message = message.toString('utf8');
	}
	return new Promise(resolve => {
		process.stdout.write(message, resolve);
	});
}

let _debug = (..._args: any[]) => { return Promise.resolve<{}>(null); };

if (process.env['VIM_TSS_LOG']) {
	const verbosity = Number(process.env['VIM_TSS_LOG']);
	if (verbosity > 0) {
		_debug = log;
	}
}
