/**
 * Tell tsserver that a file is no longer being edited
 */

import { closeFile, end, parseFileArg } from './lib/client';
import { error } from './lib/log';

const file = parseFileArg();

closeFile(file).catch(error).then(end);
