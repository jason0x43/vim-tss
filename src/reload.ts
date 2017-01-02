/**
 * Tell tsserver than a file has new data, either from a file or using data on
 * stdin.
 */

import { end, openFile, parseFileArg, reloadFile } from './lib/client';
import { debug, error } from './lib/log';

const file = parseFileArg('file [tmpfile]');
const tmpfile = process.argv[3];
let data: string;

process.stdin.on('readable', () => {
	const buf = <Buffer>process.stdin.read();
	if (buf == null) {
		let promise: Promise<any>;
		if (data != null) {
			debug('Using data from stdin');
			promise = openFile(file, data);
		}
		else {
			debug('Using file data');
			promise = reloadFile(file, tmpfile);
		}
		promise.catch(error).then(end);
	}
	else {
		data = (data || '') + buf.toString('utf8');
	}
});
