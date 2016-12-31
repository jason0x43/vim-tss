/**
 * Get formatting hints
 */

import { end, getFile, getFileExtent, format, reloadFile, FileRange } from './lib/client';
import { debug, error, print } from './lib/log';

const filename = getFile();

// If provided, this file is considered to be the true source of file data
const realfile = process.argv[3];

let promise = Promise.resolve();
let range: Promise<FileRange>;

// If a realfile was provided, tell the server to update its view of the file
if (realfile) {
	promise = reloadFile(filename, realfile);
	range = getFileExtent(realfile);
}

promise.then(() => format(filename, range))
	.then(edits => {
		debug(`Got edits`);
		edits.slice().reverse().forEach(edit => {
			print(`${filename}(${edit.start.line},${edit.start.offset}..${edit.end.line},${edit.end.offset}): ${edit.newText}\n`);
		});
	})
	.catch(error)
	.then(end);
