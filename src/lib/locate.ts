import { FileLocation } from './client';
import { die, print } from './log';
import { readFile } from 'fs';
import minParseArgs = require('minimist');

export function parseArgs() {
	const argv = minParseArgs(process.argv.slice(2), {
		boolean: ['reload' ],
		alias: { 'reload': 'r' }
	});

	if (argv._.length !== 3) {
		die('Filename, line, and offset are required');
	}

	const fileLocation: FileLocation = {
		file: argv._[0],
		line:  Number(argv._[1]),
		offset: Number(argv._[2])
	};

	return { argv, fileLocation };
}

export function toFileLocations(spans: protocol.FileSpan[], loadText = true) {
	let fileLines: { [filename: string]: protocol.Location[] } = {};

	// Collect all the span start locations, grouping by file
	spans.forEach(span => {
		if (!fileLines[span.file]) {
			fileLines[span.file] = [];
		}
		fileLines[span.file].push(span.start);
	});

	let lineSets: FileLocation[][] | Promise<FileLocation[][]>;

	// If the user requested text for the locations, load each file mentioned in a span, then get text for all spans
	// in that file.
	if (loadText) {
		lineSets = Promise.all(Object.keys(fileLines).map(file => {
			return new Promise<FileLocation[]>((resolve, reject) => {
				readFile(file, (err, data) => {
					if (err) {
						reject(err);
					}
					else {
						const lines = data.toString('utf8').split('\n');
						resolve(fileLines[file].map(loc => {
							return { file, line: loc.line, offset: loc.offset, text: lines[loc.line - 1] };
						}));
					}
				});
			});
		}));
	}
	else {
		lineSets = Object.keys(fileLines).map(file => {
			return fileLines[file].map(loc => {
				return { file, line: loc.line, offset: loc.offset };
			});
		});
	}

	return Promise.resolve(lineSets).then((lineSets: FileLocation[][]) => {
		// lineSets is an array of FileLocation[], where each FileLocation[] pertains to a single file. Concat all of these into
		// a single large list.
		return lineSets.reduce((allFileLocations, fileLines) => {
			return allFileLocations.concat(fileLines);
		}, []);
	});
}

export function printFileLocation(loc: FileLocation) {
	let message = `${loc.file}(${loc.line},${loc.offset})`;
	if (loc.text) {
		message += `: ${loc.text}`;
	}
	print(`${message}\n`);
}
