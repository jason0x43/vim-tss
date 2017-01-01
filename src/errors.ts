/**
 * Get syntax errors
 */

import { end, reloadFile, getSemanticDiagnostics, getSyntacticDiagnostics } from './lib/client';
import { error, print } from './lib/log';
import parseArgs = require('minimist');

const argv = parseArgs(process.argv.slice(2), {
	boolean: [ 'reload' ],
	alias: { 'reload': 'r' }
});

const filename = argv._[0];
if (!filename) {
	error('Filename is required');
	process.exit(1);
}

let hasErrors = false;
let promise = argv['reload'] ? reloadFile(filename) : Promise.resolve();

promise.then(() => {
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
