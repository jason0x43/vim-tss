/**
 * Print the location(s) of the symbol at a particular position in a file
 */

import { toFileLocations } from './lib/locate';
import { connect, definition, end, FileLocation, failure, success } from './lib/client';
import { parseArgs } from './lib/opts';

const { args, port } = parseArgs({
	args: [ 'file', 'line', 'offset' ]
});

const location: FileLocation = {
	file: args[0],
	line:  Number(args[1]),
	offset: Number(args[2])
};

connect(port).then(() => definition(location))
	.then(toFileLocations)
	.then(success)
	.catch(failure)
	.then(end);
