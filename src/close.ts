import { end, closeFile } from './lib/client';
import { die, error } from './lib/log';
import parseArgs = require('minimist');

const argv = parseArgs(process.argv.slice(2));
const filename = argv._[0];

if (!filename) {
	die('A file is required');
}

closeFile(filename).catch(error).then(end);
