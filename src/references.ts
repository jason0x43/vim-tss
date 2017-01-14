/**
 * Print the locations of references to the symbol at a given location in a
 * file
 */

import { parseArgs } from './lib/opts';
import { connect, end, failure, FileLocation, references, success } from './lib/client';

const { args, port } = parseArgs({
	args: [ 'file', 'line', 'offset' ]
});

const location: FileLocation = {
	file: args[0],
	line:  Number(args[1]),
	offset: Number(args[2])
};

connect(port).then(() => references(location))
	.then(response => response.refs.map(ref => {
		const loc: FileLocation = {
			file: ref.file,
			line: ref.start.line,
			offset: ref.start.offset,
			text: ref.lineText
		};
		return loc;
	}))
	.then(success)
	.catch(failure)
	.then(end);
