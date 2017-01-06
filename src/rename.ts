/**
 * Find all rename locations for a symbol at location within a file
 */

import { RenameLocation, rename, success, failure, end } from './lib/client';
import { die } from './lib/log';
import { basename, relative } from 'path';

function parseFlags(args: string[]): [string[], any] {
	const flags: any = {};

	while (true) {
		if (args[0] === '--comments' || args[0] === '-c') {
			flags.findInComments = true;
			args.shift();

			continue;
		}
		if (args[0] === '--strings' || args[0] === '-s') {
			flags.findInStrings = true;
			args.shift();

			continue;
		}
		break;
	}

	return [args, flags];
}

const [ args, flags ] = parseFlags(process.argv.slice(2));

if (args.length < 3) {
	const command = basename(process.argv[1]);
	die(`usage: ${command} [-c,--comments] [-s,--strings] filename line offset`);
}

const location: RenameLocation = {
	file: args[0],
	line: Number(args[1]),
	offset: Number(args[2]),
	...flags
};

rename(location)
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
