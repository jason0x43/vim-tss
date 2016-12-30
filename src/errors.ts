/**
 * Get syntax errors
 */

import { end, getFile, reloadFile, getSemanticDiagnostics, getSyntacticDiagnostics } from './lib/client';
import { error, print } from './lib/log';

const filename = getFile();
let hasErrors = false;

reloadFile(filename).then(() => {
	return Promise.all([ getSyntacticDiagnostics(filename), getSemanticDiagnostics(filename) ]);
}).then(allDiags => {
	hasErrors = allDiags.some(diags => diags.length > 0);
	allDiags.forEach(diags => {
		diags.forEach(diag => {
			print(`${filename}(${diag.start.line},${diag.start.offset}): error TS${diag.code}: ${diag.text}\n`);
		});
	});
}).catch(error).then(end).then(() => {
	if (hasErrors) {
		process.exit(1);
	}
});
