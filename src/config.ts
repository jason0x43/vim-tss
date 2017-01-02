/**
 * Send formatOptions from a config file to tsserver
 */

import { configure, end, parseFileArg } from './lib/client';
import { error } from './lib/log';

const file = parseFileArg();

configure(file).catch(error).then(end);
