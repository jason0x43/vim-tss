/**
 * Get a list of references to the symbol at a given location
 */

import { parseArgs } from './lib/locate';
import { end, references, reloadFile } from './lib/client';
import { error, print } from './lib/log';

const { argv, fileLocation } = parseArgs();
let promise: Promise<any> = argv['reload'] ? reloadFile(fileLocation.file) : Promise.resolve();

promise.then(() => references(fileLocation))
	.then(response => {
		response.refs.forEach((ref: protocol.ReferencesResponseItem) => {
			print(`${ref.file}(${ref.start.line},${ref.start.offset}): ${ref.lineText}\n`);
		});
	})
	.catch(error)
	.then(end);
