/**
 * Get a symbol definition
 */

import { parseArgs, printFileLocation, toFileLocations } from './lib/locate';
import { end, definition, reloadFile } from './lib/client';
import { error } from './lib/log';

const { argv, fileLocation } = parseArgs();
let promise: Promise<any> = argv['reload'] ? reloadFile(fileLocation.file) : Promise.resolve();

promise.then(() => definition(fileLocation))
	.then(spans => toFileLocations(spans, argv['text']))
	.then(locations => locations.forEach(printFileLocation))
	.catch(error)
	.then(end);
