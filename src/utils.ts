import type * as t from 'resolve.exports';

export type Entry = t.Exports.Entry | t.Imports.Entry;
export type Value = t.Exports.Value | t.Imports.Value;
export type Mapping = Record<Entry, Value>;

export function throws(name: string, entry: Entry, condition?: number): never {
	throw new Error(
		condition
		? `No known conditions for "${entry}" entry in "${name}" package`
		: `Missing "${entry}" export in "${name}" package`
	);
}

export function conditions(options: t.Options): Set<t.Condition> {
	let out = new Set([ 'default', ...options.conditions || [] ]);
	options.unsafe || out.add(options.require ? 'require' : 'import');
	options.unsafe || out.add(options.browser ? 'browser' : 'node');
	return out;
}

export function walk(name: string, mapping: Mapping, input: string, options?: t.Options): string[] | string {
	let entry = toEntry(name, input);
	let c = conditions(options || {});

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
			} else if (key.length > 1) {
				// TODO: RegExp().exec everything?
				tmp = key.indexOf('*', 2);

				if (!!~tmp) {
					match = RegExp(
						'^' + key.substring(0, tmp) + '(.*)' + key.substring(1+tmp)
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

	let v = loop(m, c);
	// unknown condition(s)
	if (!v) throws(name, entry, 1);

	return (exact || !replace) ? v : injects(v, replace);
}

export function injects(item: string[]|string, value: string): string[]|string {
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

/**
 * @param name package name
 * @param ident entry identifier
 * @param externals allow non-path (external) result
 * @see https://esbench.com/bench/59fa3e6799634800a0349382
 */
export function toEntry(name: string, ident: string, externals?: false): Entry;
export function toEntry(name: string, ident: string, externals: true): Entry | string;
export function toEntry(name: string, ident: string, externals?: boolean): Entry | string {
	if (name === ident || ident === '.') return '.';

	let root = name+'/', len = root.length;
	let bool = ident.slice(0, len) === root;

	let output = bool ? ident.slice(len) : ident;
	if (output[0] === '#') return output as t.Imports.Entry;

	return (bool || !externals)
		? (output.slice(0,2) === './' ? output : './' + output) as t.Path
		: output as string | t.Exports.Entry;
}

export function loop(m: Value, keys: Set<t.Condition>, result?: Set<string>): string[] | string | void {
	if (m) {
		if (typeof m === 'string') {
			return m;
		}

		let
			idx: number | string,
			arr: Set<string>,
			tmp: string[] | string | void;

		if (Array.isArray(m)) {
			arr = result || new Set;

			for (idx=0; idx < m.length; idx++) {
				tmp = loop(m[idx], keys, arr);
				if (tmp) arr.add(tmp as string);
			}

			// TODO: send string if len=1?
			if (!result && arr.size) {
				return [...arr];
			}
		} else for (idx in m) {
			if (keys.has(idx)) {
				return loop(m[idx], keys, result);
			}
		}
	}
}

// TODO: match exact key too -> [string,]
export function longest(map: Record<string,any>|null, entry: Entry): void | [Entry, string] {
	let key: string;
	let match: RegExpExecArray|null;
	let longest: Entry|undefined;
	let value: string|undefined;
	let tmp: string|number;

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

	// must have a value
	if (longest && value) {
		return [longest, value];
	}

	// if (longest && value) {
	// 	// must have a value
	// 	tmp = loop(map[longest], allows);
	// 	if (!tmp) return bail(name, entry);

	// 	return tmp.includes('*')
	// 		? tmp.replace(/[*]/g, value)
	// 		: tmp + value;
	// }
}
