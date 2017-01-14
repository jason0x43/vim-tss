/**
 * Find all rename locations for a symbol at location within a file
 */

import { connect, end, failure, rename, RenameLocation, success } from './lib/client';
import { relative } from 'path';
import { parseArgs } from './lib/opts';

const { args, flags, port } = parseArgs({
	args: [ 'file', 'line', 'offset' ],
	flags: { 'comments': 'c', 'strings': 's' }
});

const location: RenameLocation = {
	file: args[0],
	line: Number(args[1]),
	offset: Number(args[2]),
	findInComments: flags['comments'],
	findInStrings: flags['strings']
};

connect(port).then(() => rename(location))
	.then(response => {
		// Remove any locs that are in node_modules
		response.locs = response.locs.filter(loc => {
			return !(/\bnode_modules\//).test(loc.file);
		});
		// Make all loc files relative to the CWD, which is also what VIM
		// should be doing
		response.locs.forEach(loc => {
			loc.file = relative('.', loc.file);
		});
		return response;
	})
	.then(success)
	.catch(failure)
	.then(end);
