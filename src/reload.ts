/**
 * Tell tsserver than a file has new data, either from a file or using data on
 * stdin.
 */

import { connect, end, openFile, reloadFile } from './lib/client';
import { debug, error } from './lib/log';
import { parseArgs } from './lib/opts';

const { args, port } = parseArgs({ args: [ 'file', '[tmpfile]' ] });
const file = args[0];
const tmpfile = args[1];

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
	return connect(port).then((): Promise<any> => {
		if (data != null) {
			debug('Using data from stdin');
			return openFile(file, data);
		}
		else {
			debug('Using file data');
			return reloadFile(file, tmpfile);
		}
	});
}).catch(error).then(end);
