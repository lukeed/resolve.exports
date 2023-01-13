import type * as t from 'resolve.exports';

/**
 * @param name package name
 * @param ident entry identifier
 * @see https://esbench.com/bench/59fa3e6799634800a0349382
 */
export function toEntry(name: string, ident: string, force?: true): t.Exports.Entry | t.Imports.Entry;
export function toEntry(name: string, ident: string, force?: false): t.Exports.Entry | t.Imports.Entry | string;
export function toEntry(name: string, ident: string, force?: boolean): t.Exports.Entry | t.Imports.Entry | string {
	if (name === ident) return '.';

	let root = name+'/', len = root.length;
	let bool = ident.slice(0, len) === root;

	let output = bool ? ident.slice(len) : ident;
	if (output[0] === '#') return output as t.Imports.Entry;

	return (bool || force)
		? (output.slice(0,2) === './' ? output : './' + output) as t.Path
		: output as string | t.Exports.Entry;
}

export function loop(exports: t.Exports.Value, keys: Set<t.Condition>): t.Path | void {
	if (typeof exports === 'string') {
		return exports;
	}

	if (exports) {
		let idx: number | string, tmp: t.Path | void;
		if (Array.isArray(exports)) {
			// TODO: return all resolved truthys (flatten)
			for (idx=0; idx < exports.length; idx++) {
				if (tmp = loop(exports[idx], keys)) return tmp;
			}
		} else {
			for (idx in exports) {
				if (keys.has(idx)) {
					return loop(exports[idx], keys);
				}
			}
		}
	}
}
