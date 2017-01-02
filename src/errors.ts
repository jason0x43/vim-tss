/**
 * Print errors for a file. By default, this command will notify tsserver to
 * reload the file before checking it for errors. A '-n' or '--no-reload'
 * option may be specified *after* the filename to prevent this.
 */

import {
	FileLocation,
	end,
	getSemanticDiagnostics,
	getSyntacticDiagnostics,
	parseFileArg,
	reloadFile
} from './lib/client';
import { error } from './lib/log';
import { printFileLocation } from './lib/locate';

const file = parseFileArg('file [-n,--no-reload]');

const arg3 = process.argv[3];
const noReload = arg3 === '--no-reload' || arg3 === '-n';

const promise = noReload ? Promise.resolve() : reloadFile(file);

promise
	.then(() => Promise.all([
		getSyntacticDiagnostics(file),
		getSemanticDiagnostics(file)
	]))
	.then(results => {
		const diags = [].concat(...results);
		return diags.map(toFileLocation);
	})
	.then(locations => locations.forEach(printFileLocation))
	.catch(error)
	.then(end);

function toFileLocation(diag: protocol.Diagnostic) {
	const loc: FileLocation = {
		file,
		line: diag.start.line,
		offset: diag.start.offset,
		text: `error TS${diag.code}: ${diag.text}`
	};
	return loc;
}
