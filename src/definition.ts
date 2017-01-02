/**
 * Print the location(s) of the symbol at a particular position in a file
 */

import { parseArgs, printFileLocation, toFileLocations } from './lib/locate';
import { end, definition } from './lib/client';
import { error } from './lib/log';

const fileLocation = parseArgs();

definition(fileLocation)
	.then(spans => toFileLocations(spans, true))
	.then(locations => locations.forEach(printFileLocation))
	.catch(error)
	.then(end);
