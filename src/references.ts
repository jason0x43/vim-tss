/**
 * Print the locations of references to the symbol at a given location in a
 * file
 */

import { parseArgs } from './lib/locate';
import { FileLocation, end, failure, references, success } from './lib/client';

const fileLocation = parseArgs();

references(fileLocation)
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
