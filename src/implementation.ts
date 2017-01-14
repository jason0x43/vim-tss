/**
 * Print the location(s) where a symbol is implemented
 */

import { toFileLocations } from './lib/locate';
import { connect, end, failure, FileLocation, implementation, success } from './lib/client';
import { parseArgs } from './lib/opts';

const { args, port } = parseArgs({
	args: [ 'file', 'line', 'offset' ]
});

const location: FileLocation = {
	file: args[0],
	line:  Number(args[1]),
	offset: Number(args[2])
};

connect(port).then(() => implementation(location))
	.then(toFileLocations)
	.then(success)
	.catch(failure)
	.then(end);
