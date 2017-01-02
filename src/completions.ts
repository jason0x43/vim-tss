/**
 * Print the quick info of the symbol at a particular position in a file
 */

import { parseCompletionArgs } from './lib/locate';
import { end, completions } from './lib/client';
import { print, error } from './lib/log';

const args = parseCompletionArgs();

const ignoreCase = args.ignoreCase;
const prefix = args.location.prefix;

completions(args.location)
	.then(entries => {
		entries.sort((a, b) => {
			if (a.sortText < b.sortText) {
				return -1;
			}
			else if (a.sortText > b.sortText) {
				return 1;
			}
			return 0;
		});
		if (prefix) {
			if (ignoreCase) {
				const regex = new RegExp(`^${prefix}`, 'i');
				entries = entries.filter(entry => {
					return regex.test(entry.name);
				});
			}
			else {
				entries = entries.filter(entry => {
					return entry.name.indexOf(prefix) === 0;
				});
			}
		}
		print(JSON.stringify(entries));
	})
	.catch(error)
	.then(end);
