/**
 * Tell tsserver that a file is being edited
 */

import { end, openFile, parseFileArg } from './lib/client';
import { error } from './lib/log';

const file = parseFileArg();

openFile(file).catch(error).then(end);
