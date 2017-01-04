/**
 * Print the location(s) where a symbol is implemented
 */

import { parseArgs, toFileLocations } from './lib/locate';
import { end, failure, implementation, success } from './lib/client';

const fileLocation = parseArgs();

implementation(fileLocation)
	.then(toFileLocations)
	.then(success)
	.catch(failure)
	.then(end);
