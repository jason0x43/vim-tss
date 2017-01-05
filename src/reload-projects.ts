/**
 * Tell tsserver to reload all loaded projects
 */

import { reloadProjects, end } from './lib/client';

reloadProjects()
	.then(end);
