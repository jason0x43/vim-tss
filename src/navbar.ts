/**
 * Print the navbar structure for a file
 */

import { connect, end, failure, navBar, success } from './lib/client';
import { parseArgs } from './lib/opts';

const { args, port } = parseArgs({ args: [ 'file' ] });

connect(port).then(() => navBar(args[0]))
	.then(success)
	.catch(failure)
	.then(end);
