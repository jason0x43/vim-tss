/**
 * Print the signature help for a location
 */

import { parseArgs } from './lib/opts';
import { connect, end, failure, FileLocation, signatureHelp, success } from './lib/client';

const { args, port } = parseArgs({
	args: [ 'file', 'line', 'offset' ]
});

const location: FileLocation = {
	file: args[0],
	line:  Number(args[1]),
	offset: Number(args[2])
};

connect(port).then(() => signatureHelp(location))
	.then(success)
	.catch(failure)
	.then(end);
