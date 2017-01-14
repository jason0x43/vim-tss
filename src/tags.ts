/**
 * Print ctags for a module.
 */

import { connect, end, navBar } from './lib/client';
import { die, print } from './lib/log';
import { parseArgs } from './lib/opts';

const { args, port } = parseArgs({ args: [ 'file' ] });
const file = args[0];

connect(port).then(() => navBar(file))
	.then(response => {
		// Assume we're only getting nav items for a single file, such that
		// there will be a single top-level module entry. By default the nav
		// results include a hierarchical structure rooted at an entry for the
		// module, and also entries for each symbol exported from the module.
		// Since the module entry includes these top-level items as childItems,
		// only consider the module entry.
		response[0].childItems.forEach(item => {
			printItemTag(item, []);
		});
	})
	.catch(die)
	.then(end);

function printItemTag(item: protocol.NavigationBarItem, ancestors: string[]) {
	item.spans.forEach(span => {
		ancestors = ancestors.concat(item.text);
		if (item.text !== '<function>') {
			const name = ancestors.join('/');
			print(`${name}\t${file}\t${span.start.line};"\t` +
				`${kindMap[item.kind] || item.kind[0]} \n`);
		}
		item.childItems.forEach(item => {
			printItemTag(item, ancestors);
		});
	});
}

const kindMap: { [key: string]: string } = {
	'alias': 'i',
	'class': 'C',
	'const': 'c',
	'function': 'f',
	'interface': 'I',
	'let': 'v',
	'property': 'p'
};
