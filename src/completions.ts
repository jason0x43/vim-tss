/**
 * Print the quick info of the symbol at a particular position in a file
 */

import { CompletionLocation, completions, end } from './lib/client';
import { die, print } from './lib/log';
import { basename } from 'path';

const args = process.argv.slice(2);

const ignoreCase = args[0] === '--ignore-case' || args[0] === '-i';

if (ignoreCase) {
	args.shift();
}

if (args.length < 3) {
	const command = basename(process.argv[1]);
	die(`usage: ${command} [-i,--ignore-case] filename line offset `
		+ '[prefix...]');
}

const location: CompletionLocation = {
	file: args[0],
	line:  Number(args[1]),
	offset: Number(args[2]),
	prefix: args.slice(3).join(' ')
};

completions(location)
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

		return {
			success: true,
			body: entries
		};
	})
	.catch(e => {
		return {
			success: false,
			message: e.message
		};
	})
	.then(response => {
		return print(`${JSON.stringify(response, null, '  ')}\n`);
	})
	.then(end);
