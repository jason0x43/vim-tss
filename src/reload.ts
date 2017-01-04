/**
 * Tell tsserver than a file has new data, either from a file or using data on
 * stdin.
 */

import { end, openFile, parseFileArg, reloadFile } from './lib/client';
import { debug, error } from './lib/log';

const file = parseFileArg('file [tmpfile]');
const tmpfile = process.argv[3];

const reader = new Promise<string>(resolve => {
	let data: string;
	process.stdin.on('readable', () => {
		const buf = <Buffer>process.stdin.read();
		if (buf == null) {
			resolve(data);
		}
		else {
			data = (data || '') + buf.toString('utf8');
		}
	});
});

reader.then(data => {
	if (data != null) {
		debug('Using data from stdin');
		return openFile(file, data);
	}
	else {
		debug('Using file data');
		return reloadFile(file, tmpfile);
	}
}).catch(error).then(end);
