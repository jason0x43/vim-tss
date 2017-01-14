/**
 * Print errors for a file. By default, this command will notify tsserver to
 * reload the file before checking it for errors. A '-n' or '--no-reload'
 * option may be specified *after* the filename to prevent this.
 */

import {
	FileLocation,
	connect,
	end,
	failure,
	getSemanticDiagnostics,
	getSyntacticDiagnostics,
	reloadFile,
	success
} from './lib/client';
import { parseArgs } from './lib/opts';
import { print } from './lib/log';

const { flags, args, port } = parseArgs({
	flags: { 'no-reload': 'n', json: 'j' },
	args: [ 'file' ]
});

const file = args[0];
const noReload = flags['no-reload'];
const printJson = flags['json'];

let promise: Promise<any> = connect(port);

if (!noReload) {
	promise = promise.then(() => reloadFile(file));
}

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
	.then((locations: FileLocation[]) => {
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
