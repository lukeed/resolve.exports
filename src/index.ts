import * as $ from './utils';

import type * as t from 'resolve.exports';

/**
 * @param name The package name
 * @param entry The target entry, eg "."
 * @param condition Unmatched condition?
 */
function bail(name: string, entry: string, condition?: number): never {
	throw new Error(
		condition
		? `No known conditions for "${entry}" entry in "${name}" package`
		: `Missing "${entry}" export in "${name}" package`
	);
}

export function resolve(pkg: t.Package, input?: string, options?: t.Options): string[] | string | void {
	let entry = input && input !== '.'
		? $.toEntry(pkg.name, input, true)
		: '.';

	if (entry[0] === '#') return imports(pkg, entry as t.Imports.Entry, options);
	if (entry[0] === '.') return exports(pkg, entry as t.Exports.Entry, options);
}

export function imports(pkg: t.Package, key: t.Imports.Entry, options?: t.Options): t.Imports.Output | void {
	//
}

export function exports(pkg: t.Package, target: t.Exports.Entry, options?: t.Options): t.Exports.Output | void {
	let
		name = pkg.name,
		entry = $.toEntry(name, target, true),
		isROOT = entry === '.',
		map = pkg.exports;

	if (!map) return;
	if (typeof map === 'string') {
		return isROOT ? map : bail(name, entry);
	}

	let o = options || {},
		allows = new Set([ 'default', ...o.conditions||[] ]),
		key: t.Exports.Entry | string,
		match: RegExpExecArray | null,
		longest: t.Exports.Entry | undefined,
		value: string | undefined | null,
		tmp: any, // mixed
		isSingle = false;

	o.unsafe || allows.add(o.require ? 'require' : 'import');
	o.unsafe || allows.add(o.browser ? 'browser' : 'node');

	for (key in map) {
		isSingle = key[0] !== '.';
		break;
	}

	if (isSingle) {
		return isROOT
			? $.loop(map, allows) || bail(name, entry, 1)
			: bail(name, entry);
	}

	if (tmp = map[entry]) {
		return $.loop(tmp, allows) || bail(name, entry, 1);
	}

	if (!isROOT) {
		for (key in map) {
			if (longest && key.length < longest.length) {
				// do not allow "./" to match if already matched "./foo*" key
			} else if (key[key.length - 1] === '/' && entry.startsWith(key)) {
				value = entry.substring(key.length);
				longest = key as t.Exports.Entry;
			} else {
				tmp = key.indexOf('*', 2);
				if (!!~tmp) {
					match = RegExp(
						'^\.\/' + key.substring(2, tmp) + '(.*)' + key.substring(1+tmp)
					).exec(entry);

					if (match && match[1]) {
						value = match[1];
						longest = key as t.Exports.Entry;
					}
				}
			}
		}

		if (longest && value) {
			// must have a value
			tmp = $.loop(map[longest], allows);
			if (!tmp) return bail(name, entry);

			return tmp.includes('*')
				? tmp.replace(/[*]/g, value)
				: tmp + value;
		}
	}

	return bail(name, entry);
}

// ---
// ---
// ---

type LegacyOptions = {
	fields?: string[];
	browser?: string | boolean;
}

type BrowserObject = {
	// TODO: is this right? browser object format so loose
	[file: string]: string | undefined;
}

export function legacy(pkg: t.Package, options: LegacyOptions = {}): t.Path | t.Browser | void {
	let i=0,
		value: string | t.Browser | undefined,
		browser = options.browser,
		fields = options.fields || ['module', 'main'],
		isSTRING = typeof browser == 'string';

	if (browser && !fields.includes('browser')) {
		fields.unshift('browser');
		// "module-a" -> "module-a"
		// "./path/file.js" -> "./path/file.js"
		// "foobar/path/file.js" -> "./path/file.js"
		if (isSTRING) browser = $.toEntry(pkg.name, browser as string, false);
	}

	for (; i < fields.length; i++) {
		if (value = pkg[fields[i]]) {
			if (typeof value == 'string') {
				//
			} else if (typeof value == 'object' && fields[i] == 'browser') {
				if (isSTRING) {
					value = (value as BrowserObject)[browser as string];
					if (value == null) return browser as string;
				}
			} else {
				continue;
			}

			return typeof value == 'string'
				? ('./' + value.replace(/^\.?\//, '')) as t.Path
				: value;
		}
	}
}
