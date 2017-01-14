/**
 * Print the navtree structure for a file
 */

import { connect, end, failure, navTree, success } from './lib/client';
import { parseArgs } from './lib/opts';

const { args, port } = parseArgs({ args: [ 'file' ] });

connect(port).then(() => navTree(args[0]))
	.then(success)
	.catch(failure)
	.then(end);
