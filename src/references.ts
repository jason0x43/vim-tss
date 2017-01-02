/**
 * Print the locations of references to the symbol at a given location in a
 * file
 */

import { parseArgs, printFileLocation } from './lib/locate';
import { FileLocation, end, references } from './lib/client';
import { error } from './lib/log';

const fileLocation = parseArgs();

references(fileLocation)
	.then(response => response.refs.map(toFileLocation))
	.then(locations => locations.forEach(printFileLocation))
	.catch(error)
	.then(end);

function toFileLocation(ref: protocol.ReferencesResponseItem) {
	const loc: FileLocation = {
		file: ref.file,
		line: ref.start.line,
		offset: ref.start.offset,
		text: ref.lineText
	};
	return loc;
}
