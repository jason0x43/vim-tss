/**
 * Print the type definition for a location
 */

import { parseArgs } from './lib/locate';
import { typeDefinition, success, failure, end } from './lib/client';

const fileLocation = parseArgs();

typeDefinition(fileLocation)
	.then(success)
	.catch(failure)
	.then(end);
