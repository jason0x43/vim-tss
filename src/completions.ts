/**
 * Print the quick info of the symbol at a particular position in a file
 */

import { CompletionLocation, completions, connect, end, success, failure } from './lib/client';
import { parseArgs } from './lib/opts';

const { args, port, flags } = parseArgs({
	args: [ 'file', 'line', 'offset', '[prefix...]' ],
	flags: { 'ignore-case': 'i' }
});

const ignoreCase = flags['ignore-case'];

const location: CompletionLocation = {
	file: args[0],
	line:  Number(args[1]),
	offset: Number(args[2]),
	prefix: args.slice(3).join(' ')
};

connect(port).then(() => completions(location))
	.then(entries => {
		entries.sort((a, b) => {
			if (a.sortText < b.sortText) {
				return -1;
			}
			else if (a.sortText > b.sortText) {
				return 1;
			}
			else {
				let nameA = a.name;
				let nameB = b.name;

				if (ignoreCase) {
					nameA = nameA.toLowerCase();
					nameB = nameB.toLowerCase();
				}

				if (nameA < nameB) {
					return -1;
				}
				else if (nameA > nameB) {
					return 1;
				}
			}

			return 0;
		});

		const prefix = location.prefix;
		if (prefix) {
			if (ignoreCase) {
				const regex = new RegExp(`^${prefix}`, 'i');
				entries = entries.filter(entry => regex.test(entry.name));
			}
			else {
				entries = entries.filter(entry =>
					entry.name.indexOf(prefix) === 0);
			}
		}

		return entries;
	})
	.then(success)
	.catch(failure)
	.then(end);
