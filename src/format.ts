/**
 * Get formatting hints
 */

import { end, format, FileRange, reloadFile } from './lib/client';
import { debug, error, print } from './lib/log';
import parseArgs = require('minimist');

const argv = parseArgs(process.argv.slice(2), {
	boolean: [ 'reload' ],
	alias: { 'reload': 'r' }
});

const filename = argv._[0];
if (!filename) {
	error('Filename is required');
	process.exit(1);
}

let range: FileRange;

if (argv._.length >= 5) {
	const line = Number(argv._[1]);
	const offset = Number(argv._[2]);
	const endLine = Number(argv._[3]);
	const endOffset = Number(argv._[4]);
	range = { line, offset, endLine, endOffset };
}

let promise = argv['reload'] ? reloadFile(filename) : Promise.resolve();

promise.then(() => {
	return format(filename, range);
}).then(edits => {
	debug(`Got edits`);
	edits.slice().reverse().forEach(edit => {
		print(`${filename}(${edit.start.line},${edit.start.offset}..${edit.end.line},${edit.end.offset}): ${edit.newText}\n`);
	});
})
.catch(error)
.then(end);
