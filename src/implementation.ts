/**
 * Print the location(s) where a symbol is implemented
 */

import { parseArgs, printFileLocation, toFileLocations } from './lib/locate';
import { end, implementation } from './lib/client';
import { error } from './lib/log';

const fileLocation = parseArgs();

implementation(fileLocation)
	.then(spans => toFileLocations(spans))
	.then(locations => locations.forEach(printFileLocation))
	.catch(error)
	.then(end);
