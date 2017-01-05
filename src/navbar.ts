/**
 * Print the navbar structure for a file
 */

import { navBar, end, success, failure, parseFileArg } from './lib/client';

const file = parseFileArg('file');

navBar(file)
	.then(success)
	.catch(failure)
	.then(end);
