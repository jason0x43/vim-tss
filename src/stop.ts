/**
 * Gracefully stop a running tsserver
 */

import { connect, exit } from './lib/client';
import { parseArgs } from './lib/opts';

const { opts } = parseArgs();

connect(Number(opts['port'])).then(() => exit());
