/**
 * Print the signature help for a location
 */

import { parseArgs } from './lib/locate';
import { signatureHelp, success, failure, end } from './lib/client';

const fileLocation = parseArgs();

signatureHelp(fileLocation)
	.then(success)
	.catch(failure)
	.then(end);
