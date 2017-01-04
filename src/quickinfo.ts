/**
 * Print the quick info of the symbol at a particular position in a file
 */

import { parseArgs } from './lib/locate';
import { end, failure, quickInfo, success } from './lib/client';

const fileLocation = parseArgs();

quickInfo(fileLocation)
	.then(success)
	.catch(failure)
	.then(end);
