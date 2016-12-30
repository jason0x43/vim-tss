import { end, getFile, openFile } from './lib/client';
import { error } from './lib/log';

openFile(getFile()).catch(error).then(end);
