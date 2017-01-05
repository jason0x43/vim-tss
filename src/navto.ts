/**
 * Print navto items for a symbol in a file
 */

import { navTo, success, failure, end } from './lib/client';
import { die } from './lib/log';
import { basename } from 'path';

const args = process.argv.slice(2);
const searchProject = args[0] === '--search-project' || args[0] === '-s';

if (searchProject) {
	args.shift();
}

if (args.length < 2) {
	const command = basename(process.argv[1]);
	die(`usage: ${command} [-s,--search-project] filename searchValue`);
}

const navToArgs: protocol.NavtoRequestArgs = {
	file: args[0],
	searchValue: args[1],
	currentFileOnly: !searchProject
};

navTo(navToArgs)
	.then(success)
	.catch(failure)
	.then(end);
