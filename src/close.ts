/**
 * Tell tsserver that a file is no longer being edited
 */

import { closeFile, connect, end } from './lib/client';
import { parseArgs } from './lib/opts';
import { error } from './lib/log';

const { args, port } = parseArgs({ args: [ 'file' ] });

connect(port).then(() => closeFile(args[0]))
	.catch(error)
	.then(end);
