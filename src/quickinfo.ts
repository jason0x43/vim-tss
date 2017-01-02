/**
 * Print the quick info of the symbol at a particular position in a file
 */

import { parseArgs } from './lib/locate';
import { end, quickInfo } from './lib/client';
import { debug, print } from './lib/log';

const fileLocation = parseArgs();

quickInfo(fileLocation)
	.then(body => {
		if (body.displayString) {
			print(body.displayString);

			if (body.documentation) {
				print(`\n\n${body.documentation}`);
			}
		}
		else {
			print('There is no hint at the cursor.\n');
		}
	})
	.catch(err => {
		debug(err);
		print('There is no hint at the cursor.\n');
	})
	.then(end);
