/**
 * Find all rename locations for a symbol at location within a file
 */

import { RenameLocation, rename, success, failure, end } from './lib/client';
import { die } from './lib/log';
import { basename } from 'path';

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

interface RenameResult extends protocol.RenameResponseBody {
	requested: protocol.TextSpan[];
	spanMap: { [ key: string]: protocol.TextSpan[] };
}

rename(location)
	.then(response => {
		const result: RenameResult = {
			requested: undefined,
			spanMap: {},
			...response
		};

		response.locs.forEach(spanGroup => {
			if (spanGroup.file === location.file) {
				result.requested = spanGroup.locs;
			}
			else {
				result.spanMap[spanGroup.file] = spanGroup.locs;
			}
		});

		return result;
	})
	.then(success)
	.catch(failure)
	.then(end);
