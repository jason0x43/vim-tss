/**
 * Get formatting hints for a file based on the currently configured options in
 * tsserver. See the `config` command.
 */

import {
	connect,
	end,
	failure,
	format,
	FileRange,
	success
} from './lib/client';
import { parseArgs } from './lib/opts';

const { args, port } = parseArgs({
	args: [ 'file', '[line offset endLine endOffset]' ]
});

const file = args[0];

let range: FileRange;
if (args.length >= 5) {
	const line = Number(args[1]);
	const offset = Number(args[2]);
	const endLine = Number(args[3]);
	const endOffset = Number(args[4]);
	range = { line, offset, endLine, endOffset };
}

connect(port).then(() => format(file, range))
	.then(edits => {
		// Reverse the list of edits so that they're printed in the order in
		// which they should be applied.
		return edits.slice().reverse();
	})
	.then(success)
	.catch(failure)
	.then(end);
