import { configure, end } from './lib/client';
import { error } from './lib/log';
import parseArgs = require('minimist');

const argv = parseArgs(process.argv.slice(2));
const filename = argv._[0];

configure(filename).catch(error).then(end);
