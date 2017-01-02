/**
 * Print the quick info of the symbol at a particular position in a file
 */

import { parseArgs } from './lib/locate';
import { end, quickInfo } from './lib/client';
import { print } from './lib/log';

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
			print('There is no hint at the cursor.');
		}
	})
	.catch(() => print('There is no hint at the cursor.'))
	.then(end);
