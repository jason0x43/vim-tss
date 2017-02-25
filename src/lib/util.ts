import { readdirSync, readFileSync, statSync } from 'fs';
import { debug } from './log';
import { dirname, extname, join, resolve } from 'path';

export function fileExists(filename: string) {
	try {
		statSync(filename);
		return true;
	}
	catch (err) {
		return false;
	}
}

/**
 * Get the tsconfig file associated with a given file.
 *
 * @param file A ts or js filename
 */
export function getProjectConfigFile(file: string, configName?: string): any {
	debug(`Checking for config in ${file}`);

	if (!configName) {
		configName = `${extname(file).slice(1)}config.json`;
	}

	const path = resolve(file);
	const stats = statSync(path);
	if (!stats.isDirectory()) {
		return getProjectConfigFile(dirname(path), configName);
	}

	for (let filename of readdirSync(path)) {
		if (filename === configName) {
			return join(path, filename);
		}
	}

	if (dirname(path) === path) {
		// We're at the filesystem root -- there's nowhere else to go
		return null;
	}

	return getProjectConfigFile(dirname(path), configName);
}

/**
 * Get the tsconfig data associated with a given file.
 *
 * @param file A ts or js filename
 */
export function getProjectConfig(file: string): any {
	debug(`Checking for config in ${file}`);

	let configFile = getProjectConfigFile(file);
	if (!configFile) {
		return null;
	}

	let data = parseJSON(readFileSync(configFile, { encoding: 'utf8' }));
	let parent = data.extends;
	while (parent) {
		configFile = resolve(dirname(configFile), parent);
		let newData = parseJSON(readFileSync(configFile, { encoding: 'utf8' }));
		parent = newData.extends;
		data = mixConfigs(data, newData);
	}
	return data;
}

function mixConfigs(child: any, parent: any) {
	let config: any = {};
	for (let key in parent) {
		config[key] = parent[key];
	}

	Object.keys(child).filter(key => {
		return key !== 'extends' && key !== 'compilerOptions';
	}).forEach(key => {
		config[key] = child[key];
	});

	if (child.compilerOptions) {
		if (config.compilerOptions) {
			Object.keys(child.compilerOptions).forEach(key => {
				config.compilerOptions[key] = child.compilerOptions[key];
			});
		}
		else {
			config.compilerOptions = child.compilerOptions;
		}
	}

	return config;
}

function parseJSON(text: string): any {
	const textToParse = removeComments(text);
	return JSON.parse(textToParse);
}

function removeComments(text: string): string {
	let state: 'string' | 'block-comment' | 'line-comment' | 'default' = 'default';
	let i = 0;

	// Create an array of chars from the text, the blank out anything in a comment
	const chars = text.split('');

	while (i < chars.length) {
		switch (state) {
			case 'block-comment':
				if (chars[i] === '*' && chars[i + 1] === '/') {
					chars[i] = ' ';
					chars[i + 1] = ' ';
					state = 'default';
					i += 2;
				}
				else if (chars[i] !== '\n') {
					chars[i] = ' ';
					i += 1;
				}
				else {
					i += 1;
				}
				break;

			case 'line-comment':
				if (chars[i] === '\n') {
					state = 'default';
				}
				else {
					chars[i] = ' ';
				}
				i += 1;
				break;

			case 'string':
				if (chars[i] === '"') {
					state = 'default';
					i += 1;
				}
				else if (chars[i] === '\\' && chars[i + 1] === '\\') {
					i += 2;
				}
				else if (chars[i] === '\\' && chars[i + 1] === '"') {
					i += 2;
				}
				else {
					i += 1;
				}
				break;

			default:
				if (chars[i] === '"') {
					state = 'string';
					i += 1;
				}
				else if (chars[i] === '/' && chars[i + 1] === '*') {
					chars[i] = ' ';
					chars[i + 1] = ' ';
					state = 'block-comment';
					i += 2;
				}
				else if (chars[i] === '/' && chars[i] === '/') {
					chars[i] = ' ';
					chars[i + 1] = ' ';
					state = 'line-comment';
					i += 2;
				}
				else {
					i += 1;
				}
		}
	}

	return chars.join('');
}
