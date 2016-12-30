/**
 * Get formatting hints
 */

import { end, getFile, reloadFile, format } from './lib/client';
import { error, print } from './lib/log';

const filename = getFile();

reloadFile(filename).then(() => {
	return format(filename);
}).then(edits => {
	edits.slice().reverse().forEach(edit => {
		print(`${filename}(${edit.start.line},${edit.start.offset}..${edit.end.line},${edit.end.offset}): ${edit.newText}\n`);
	});
}).catch(error).then(end);
