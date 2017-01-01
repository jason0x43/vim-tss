import { end, openFile } from './lib/client';
import { die, error } from './lib/log';
import parseArgs = require('minimist');

const argv = parseArgs(process.argv.slice(2));
const filename = argv._[0];

if (!filename) {
	die('A file is required');
}

openFile(filename).catch(error).then(end);
