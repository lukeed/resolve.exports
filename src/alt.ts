import * as $ from './utils';

import type * as t from 'resolve.exports';

// function throws(msg: string): never {
// 	throw new Error(msg);
// }

function throws(name: string, entry: Entry, condition?: number): never {
	throw new Error(
		condition
		? `No known conditions for "${entry}" entry in "${name}" package`
		: `Missing "${entry}" export in "${name}" package`
	);
}

export function exports(pkg: t.Package, input?: string, options?: t.Options): string[] | string | void {
	let map = pkg.exports,
		k: string;

	if (map) {
		if (typeof map === 'string') {
			map = { '.': map };
		} else for (k in map) {
			// convert {conditions} to "."={condtions}
			if (k[0] !== '.') map = { '.': map };
			break;
		}

		return walk(pkg.name, map, input||'.', options);
	}
}

export function imports(pkg: t.Package, input: string, options?: t.Options): string[] | string | void {
	if (pkg.imports) return walk(pkg.name, pkg.imports, input, options);
}

type Entry = t.Exports.Entry | t.Imports.Entry;
type Value = t.Exports.Value | t.Imports.Value;
type Mapping = Record<Entry, Value>;

function walk(name: string, mapping: Mapping, input: string, options?: t.Options): string[] | string {
	let entry = $.toEntry(name, input);
	let c = $.conditions(options || {});

	let m: Value | undefined = mapping[entry];
	let replace: string | undefined;
	let exact = m !== void 0;

	if (!exact) {
		// loop for longest key match
		let match: RegExpExecArray|null;
		let longest: Entry|undefined;
		let tmp: string|number;
		let key: Entry;

		for (key in mapping) {
			if (longest && key.length < longest.length) {
				// do not allow "./" to match if already matched "./foo*" key
			} else if (key[key.length - 1] === '/' && entry.startsWith(key)) {
				replace = entry.substring(key.length);
				longest = key;
			} else {
				// TODO: key.length > 1 (prevents ".")
				// TODO: RegExp().exec everything?
				tmp = key.indexOf('*', 2);

				if (!!~tmp) {
					match = RegExp(
						// TODO: this doesnt work for #import keys
						'^\.\/' + key.substring(2, tmp) + '(.*)' + key.substring(1+tmp)
					).exec(entry);

					if (match && match[1]) {
						replace = match[1];
						longest = key;
					}
				}
			}
		}

		m = mapping[longest!];
	}

	if (!m) {
		// missing export
		throws(name, entry);
	}

	let v = $.loop(m, c);
	// if (!v) throws('unknown condition');
	if (!v) throws(name, entry, 1);

	return (exact || !replace) ? v : injects(v, replace);
}

function injects(item: string[]|string, value: string): string[]|string {
	let bool = Array.isArray(item);
	let arr: string[] = bool ? item as string[] : [item as string];
	let i=0, len=arr.length, rgx=/[*]/g, tmp: string;

	for (; i < len; i++) {
		arr[i] = rgx.test(tmp = arr[i])
			? tmp.replace(rgx, value)
			: (tmp+value);
	}

	return bool ? arr : arr[0];
}
