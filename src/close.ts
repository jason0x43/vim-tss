import { end, closeFile, getFile } from './lib/client';
import { error } from './lib/log';

closeFile(getFile()).catch(error).then(end);
