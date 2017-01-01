/**
 * Get the location(s) where a symbol is implemented
 */

import { parseArgs, printFileLocation, toFileLocations } from './lib/locate';
import { end, implementation, reloadFile } from './lib/client';
import { error } from './lib/log';

const { argv, fileLocation } = parseArgs();
let promise: Promise<any> = argv['reload'] ? reloadFile(fileLocation.file) : Promise.resolve();

promise.then(() => implementation(fileLocation))
	.then(spans => toFileLocations(spans))
	.then(locations => locations.forEach(printFileLocation))
	.catch(error)
	.then(end);
