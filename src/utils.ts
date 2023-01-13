import type * as t from 'resolve.exports';

export function conditions(options: t.Options): Set<t.Condition> {
	let out = new Set([ 'default', ...options.conditions || [] ]);
	options.unsafe || out.add(options.require ? 'require' : 'import');
	options.unsafe || out.add(options.browser ? 'browser' : 'node');
	return out;
}

/**
 * @param name package name
 * @param ident entry identifier
 * @param externals allow non-path (external) result
 * @see https://esbench.com/bench/59fa3e6799634800a0349382
 */
export function toEntry(name: string, ident: string, externals?: false): t.Exports.Entry | t.Imports.Entry;
export function toEntry(name: string, ident: string, externals: true): t.Exports.Entry | t.Imports.Entry | string;
export function toEntry(name: string, ident: string, externals?: boolean): t.Exports.Entry | t.Imports.Entry | string {
	if (name === ident || ident === '.') return '.';

	let root = name+'/', len = root.length;
	let bool = ident.slice(0, len) === root;

	let output = bool ? ident.slice(len) : ident;
	if (output[0] === '#') return output as t.Imports.Entry;

	return (bool || !externals)
		? (output.slice(0,2) === './' ? output : './' + output) as t.Path
		: output as string | t.Exports.Entry;
}

type Output = string[] | string | void;
export function loop(m: t.Exports.Value, keys: Set<t.Condition>, result?: Set<string>): Output {
	if (m) {
		if (typeof m === 'string') {
			return m;
		}

		let
			idx: number | string,
			arr: Set<string>,
			tmp: Output;

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
