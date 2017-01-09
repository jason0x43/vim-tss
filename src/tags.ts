/**
 * Print the navbar structure for a file
 */

import { navBar, end, parseFileArg } from './lib/client';
import { die, print } from './lib/log';

const file = parseFileArg('file');

navBar(file)
	.then(response => {
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
