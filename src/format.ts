/**
 * Get formatting hints for a file based on the currently configured options in
 * tsserver. See the `config` command.
 */

import { end, format, FileRange, parseFileArg } from './lib/client';
import { debug, error, print } from './lib/log';

const file = parseFileArg('file [line offset endLine endOffset]');

const args = process.argv.slice(3);
let range: FileRange;
if (args.length >= 4) {
	const line = Number(args[0]);
	const offset = Number(args[1]);
	const endLine = Number(args[2]);
	const endOffset = Number(args[3]);
	range = { line, offset, endLine, endOffset };
}

format(file, range)
	.then(edits => {
		debug(`Got edits`);
		// Reverse the list of edits so that they're printed in the order in
		// which they should be applied.
		edits.slice().reverse().forEach(edit => {
			print(`${file}(${edit.start.line},${edit.start.offset}..` +
				`${edit.end.line},${edit.end.offset}): ${edit.newText}\n`);
		});
	})
	.catch(error)
	.then(end);
