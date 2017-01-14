/**
 * Print navto items for a symbol in a file
 */

import { connect, end, failure, navTo, success } from './lib/client';
import { parseArgs } from './lib/opts';

const { args, flags, port } = parseArgs({
	args: [ 'file', 'searchValue' ],
	flags: { 'search-project': 's' }
});

const searchProject = flags['search-project'];

const navToArgs: protocol.NavtoRequestArgs = {
	file: args[0],
	searchValue: args[1],
	currentFileOnly: !searchProject
};

connect(port).then(() => navTo(navToArgs))
	.then(success)
	.catch(failure)
	.then(end);
