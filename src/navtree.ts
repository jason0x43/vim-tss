/**
 * Print the navtree structure for a file
 */

import { navTree, end, success, failure, parseFileArg } from './lib/client';

const file = parseFileArg('file');

navTree(file)
	.then(success)
	.catch(failure)
	.then(end);
