/**
 * Print the quick info of the symbol at a particular position in a file
 */

import { parseArgs } from './lib/opts';
import { connect, end, failure, FileLocation, quickInfo, success } from './lib/client';

const { args, port } = parseArgs({
	args: [ 'file', 'line', 'offset' ]
});

const location: FileLocation = {
	file: args[0],
	line:  Number(args[1]),
	offset: Number(args[2])
};

connect(port).then(() => quickInfo(location))
	.then(success)
	.catch(failure)
	.then(end);
