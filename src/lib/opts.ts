import { basename } from 'path';
import { print } from './log';

export interface ParseOpts {
	/** A list of positional arg names, in order */
	args?: string[];

	/**
	 * A mapping of possible options to short names, or the value 'true'. An
	 * option takes a value.
	 */
	opts?: { [option: string]: string | true };

	/**
	 * A mapping of possible flags to short names, or the value 'true'. A flag
	 * does not take a value.
	 */
	flags?: { [option: string]: string | true };
}

export interface ParsedArgs {
	args: string[];
	opts: { [key: string]: string };
	flags: { [key: string]: boolean };

	// port is a special case
	port?: number;
}

export function parseArgs(options?: ParseOpts): ParsedArgs {
	options = options || {};

	const requiredArgs = (options.args || []).filter(arg => {
		return arg[0] !== '[' && arg[arg.length - 1] !== ']';
	});
	const possibleOpts = options.opts || {};
	const possibleFlags = options.flags || {};

	// Recognize the p == port alias by default
	if (!possibleOpts['port']) {
		possibleOpts['port'] = 'p';
	}

	const rawArgs = process.argv.slice(2);
	const args: string[] = [];
	const opts: { [key: string]: string } = {};
	const flags: { [key: string]: boolean } = {};

	try {
		while (rawArgs.length > 0) {
			const arg = rawArgs.shift();
			let possibleOpt: string;

			if (/^--\w+$/.test(arg)) {
				possibleOpt = arg.slice(2);
			}
			else if (/^-\w$/.test(arg)) {
				possibleOpt = arg.slice(1);
			}

			if (possibleOpt) {
				let opt = getOpt(possibleOpts, possibleOpt);
				let flag = getOpt(possibleFlags, possibleOpt);

				if (!opt && !flag) {
					throw new Error(`Unknown option "${opt}"`);
				}

				if (opt) {
					opts[opt] = rawArgs.shift();
				}
				else {
					flags[opt] = true;
				}
			}
			else {
				args.push(arg);
			}
		}

		if (requiredArgs.length > args.length) {
			throw new Error('Not enough arguments');
		}
	}
	catch (error) {
		print(`${error.message}\n`);
		printUsage(options);
		process.exit(1);
	}

	const parsed: ParsedArgs = { args, opts, flags };

	const port = Number(opts['port']);
	if (!isNaN(port)) {
		parsed.port = port;
	}

	return parsed;
}

function printUsage(options?: ParseOpts) {
	options = options || {};
	let usage = basename(process.argv[1]);

	const requiredArgs = options.args || [];
	if (requiredArgs) {
		usage += ` ${requiredArgs.join(' ')}`;
	}

	const possibleOpts = options.opts || {};
	const optStrings = Object.keys(possibleOpts).map(opt => {
		if (typeof possibleOpts[opt] === 'string') {
			return `[-${possibleOpts[opt]}|--${opt}]`;
		}
		return `[--${opt}]`;
	});
	if (optStrings.length > 0) {
		usage += ` ${optStrings.join(' ')}`;
	}

	print(`usage: ${usage}\n`);
	process.exit(1);
}

function getOpt(options: { [opt: string]: string | true }, opt: string) {
	if (options[opt]) {
		return opt;
	}

	for (let o in options) {
		if (options[o] === opt) {
			return o;
		}
	}
}
