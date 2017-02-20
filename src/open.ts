/**
 * Tell tsserver that a file is being edited
 */

import { configure, connect, end, openFile } from './lib/client';
import { error } from './lib/log';
import { parseArgs } from './lib/opts';
import { getProjectConfig } from './lib/util';

const { args, port } = parseArgs({ args: [ 'file' ] });

const tsconfig = getProjectConfig(args[0]);

connect(port).then(() => openFile(args[0]))
	.then(() => {
		if (tsconfig.formatCodeOptions) {
			return configure(args[0], tsconfig.formatCodeOptions);
		}
	})
	.catch(error)
	.then(end);
