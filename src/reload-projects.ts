/**
 * Tell tsserver to reload all loaded projects
 */

import { connect, end, reloadProjects } from './lib/client';
import { parseArgs } from './lib/opts';

const { port } = parseArgs();

connect(port).then(() => reloadProjects())
	.then(end);
