/**
 * Send formatOptions from a config file to tsserver
 */

import { configure, connect, end } from './lib/client';
import { error } from './lib/log';
import { parseArgs } from './lib/opts';
import { getProjectConfig } from './lib/util';

const { args, port } = parseArgs({ args: [ '[file]' ] });

const tsconfig = getProjectConfig(args[0]);

if (tsconfig.formatCodeOptions) {
	connect(port).then(() => configure(args[0], tsconfig.formatCodeOptions))
		.catch(error)
		.then(end);
}
