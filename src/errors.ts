/**
 * Print errors for a file. By default, this command will notify tsserver to
 * reload the file before checking it for errors. A '-n' or '--no-reload'
 * option may be specified *after* the filename to prevent this.
 */

import {
	FileLocation,
	end,
	failure,
	getSemanticDiagnostics,
	getSyntacticDiagnostics,
	parseFileArg,
	reloadFile,
	success
} from './lib/client';
import { print } from './lib/log';

const file = parseFileArg('file [-n,--no-reload] [-j,--json]');

let noReload = false;
let printJson = false;
process.argv.slice(3).forEach(arg => {
	switch (arg) {
	case '-n':
	case '--no-reload':
		noReload = true;
		break;
	case '-j':
	case '--json':
		printJson = true;
		break;
	}
});

const promise = noReload ? Promise.resolve() : reloadFile(file);

promise
	.then(() => Promise.all([
		getSyntacticDiagnostics(file),
		getSemanticDiagnostics(file)
	]))
	.then(allDiags => [].concat(...allDiags).map(diag => {
		const loc: FileLocation = {
			file,
			line: diag.start.line,
			offset: diag.start.offset,
			text: `error TS${diag.code}: ${diag.text}`
		};
		return loc;
	}))
	.then(locations => {
		if (printJson) {
			return success(locations);
		}
		else {
			locations.forEach(loc => {
				print(`${loc.file}(${loc.line},${loc.offset}): ${loc.text}\n`);
			});
		}
	})
	.catch(failure)
	.then(end);
