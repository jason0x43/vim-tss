import { configure, end, getFile } from './lib/client';
import { error } from './lib/log';

configure(getFile(false)).catch(error).then(end);
