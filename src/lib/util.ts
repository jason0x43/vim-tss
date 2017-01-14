import { statSync } from 'fs';

export function fileExists(filename: string) {
	try {
		statSync(filename);
		return true;
	}
	catch (err) {
		return false;
	}
}
