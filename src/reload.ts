import { end, reloadFile } from './lib/client';
import { die, error } from './lib/log';

const filename = process.argv[2];
if (!filename) {
	die('A file is required');
}

const tmpfile = process.argv[3];

reloadFile(filename, tmpfile).catch(error).then(end);
