/**
 * Get formatting hints for a file based on the currently configured options in
 * tsserver. See the `config` command.
 */

import {
	end,
	failure,
	format,
	FileRange,
	parseFileArg,
	success
} from './lib/client';

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
		// Reverse the list of edits so that they're printed in the order in
		// which they should be applied.
		return edits.slice().reverse();
	})
	.then(success)
	.catch(failure)
	.then(end);
