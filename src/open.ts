/**
 * Tell tsserver that a file is being edited
 */

import { connect, end, openFile } from './lib/client';
import { error } from './lib/log';
import { parseArgs } from './lib/opts';

const { args, port } = parseArgs({ args: [ 'file' ] });

connect(port).then(() => openFile(args[0]))
	.catch(error)
	.then(end);
