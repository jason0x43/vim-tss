/**
 * Print the location(s) of the symbol at a particular position in a file
 */

import { parseArgs, toFileLocations } from './lib/locate';
import { definition, end, failure, success } from './lib/client';

const fileLocation = parseArgs();

definition(fileLocation)
	.then(toFileLocations)
	.then(success)
	.catch(failure)
	.then(end);
