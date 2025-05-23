import type * as t from 'resolve.exports';

export type Entry = t.Exports.Entry | t.Imports.Entry;
export type Value = t.Exports.Value | t.Imports.Value;
export type Mapping = Record<Entry, Value>;

export function throws(name: string, entry: Entry, condition?: number): never {
	throw new Error(
		condition
		? `No known conditions for "${entry}" specifier in "${name}" package`
		: `Missing "${entry}" specifier in "${name}" package`
	);
}

export function conditions(options: t.Options): Set<t.Condition> {
	let out = new Set([ 'default', ...options.conditions || [] ]);
	options.unsafe || out.add(options.require ? 'require' : 'import');
	options.unsafe || out.add(options.browser ? 'browser' : 'node');
	return out;
}

const escape = RegExp.escape ?? ((str: string) => str.replace(/\./g, '\\.'));

export function walk(name: string, mapping: Mapping, input: string, options?: t.Options): string[] {
	let entry = toEntry(name, input);
	let c = conditions(options || {});

	let m: Value|void = mapping[entry];
	let v: string[]|void, replace: string|void;

	if (m === void 0) {
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
				tmp = key.indexOf('*', 1);

				if (!!~tmp) {
					match = RegExp(
						'^' + escape(key.substring(0, tmp)) + '(.*)' + escape(key.substring(1+tmp)) + '$'
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

	v = loop(m, c);

	// unknown condition(s)
	if (!v) throws(name, entry, 1);
	if (replace) injects(v, replace);

	return v;
}

/** @note: mutates! */
export function injects(items: string[], value: string): void {
	let i=0, len=items.length, tmp: string;
	let rgx1=/[*]/g, rgx2 = /[/]$/;

	for (; i < len; i++) {
		items[i] = rgx1.test(tmp = items[i])
			? tmp.replace(rgx1, value)
			: rgx2.test(tmp)
				? (tmp+value)
				: tmp;
	}
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

export function loop(m: Value, keys: Set<t.Condition>, result?: Set<string>): string[] | void {
	if (m) {
		if (typeof m === 'string') {
			if (result) result.add(m);
			return [m];
		}

		let
			idx: number | string,
			arr: Set<string>;

		if (Array.isArray(m)) {
			arr = result || new Set;

			for (idx=0; idx < m.length; idx++) {
				loop(m[idx], keys, arr);
			}

			// return if initialized set
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
