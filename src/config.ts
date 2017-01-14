/**
 * Send formatOptions from a config file to tsserver
 */

import { configure, connect, end } from './lib/client';
import { error } from './lib/log';
import { parseArgs } from './lib/opts';

const { args, port } = parseArgs({ args: [ '[file]' ] });

connect(port).then(() => configure(args[0]))
	.catch(error)
	.then(end);
