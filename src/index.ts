import type { Options } from '../index.d';

type Condition = string;

export type Entry = `#${string}`; // imports

export type Path = `.${string}`;
export type Subpath = `./${string}`;

export type Imports = {
	[entry: Entry]: Value | null;
}

export type Exports = Subpath | {
	[path: Path]: Value | null;
	[cond: Condition]: Value | null;
};

export type Value = {
	[c: Condition]: Value | null;
} | Subpath | Value[];

export type Browser = string[] | {
	[file: Subpath | string]: string | false;
}

export type Package = {
	name: string;
	version?: string;
	module?: string;
	main?: string;
	imports?: Imports;
	exports?: Exports;
	browser?: Browser | string;
	[key: string]: any;
};

function loop(exports: Exports | Value[] | null, keys: Set<Condition>): Subpath|void {
	if (typeof exports === 'string') {
		return exports;
	}

	if (exports) {
		let idx: number | string, tmp: File|Value|void;
		if (Array.isArray(exports)) {
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

/**
 * @param name The package name
 * @param entry The target entry, eg "."
 * @param condition Unmatched condition?
 */
function bail(name: string, entry: Path, condition?: number): never {
	throw new Error(
		condition
		? `No known conditions for "${entry}" entry in "${name}" package`
		: `Missing "${entry}" export in "${name}" package`
	);
}

/**
 * @param name the package name
 * @param entry the target path/import
 */
function toName(name: string, entry: string): Path {
	return (
		entry === name ? '.'
		: entry[0] === '.' ? entry
		: entry.replace(new RegExp('^' + name + '\/'), './')
	 ) as Path;
}

export function resolve(pkg: Package, entry = '.', options?: Options) {
	let { name, exports } = pkg;

	if (exports) {
		let { browser, require, unsafe, conditions=[] } = options || {};

		let target = toName(name, entry);
		if (target !== '.' && !target.startsWith('./')) {
			target = './' + target as Subpath; // ".ini" => "./.ini"
		}

		if (typeof exports === 'string') {
			return target === '.' ? exports : bail(name, target);
		}

		let allows = new Set(['default', ...conditions]);
		unsafe || allows.add(require ? 'require' : 'import');
		unsafe || allows.add(browser ? 'browser' : 'node');

		let key, m, k, kv, tmp, isSingle=false;

		for (key in exports) {
			isSingle = key[0] !== '.';
			break;
		}

		if (isSingle) {
			return target === '.'
				? loop(exports, allows) || bail(name, target, 1)
				: bail(name, target);
		}

		if (tmp = exports[target]) {
			return loop(tmp, allows) || bail(name, target, 1);
		}

		if (target !== '.') {
			for (key in exports) {
				if (k && key.length < k.length) {
					// do not allow "./" to match if already matched "./foo*" key
				} else if (key[key.length - 1] === '/' && target.startsWith(key)) {
					kv = target.substring(key.length);
					k = key;
				} else {
					tmp = key.indexOf('*', 2);
					if (!!~tmp) {
						m = RegExp(
							'^\.\/' + key.substring(2, tmp) + '(.*)' + key.substring(1+tmp)
						).exec(target);

						if (m && m[1]) {
							kv = m[1];
							k = key;
						}
					}
				}
			}

			if (k && kv) {
				// must have value
				tmp = loop(exports[k], allows);
				if (!tmp) return bail(name, target);

				return tmp.includes('*')
					? tmp.replace(/[*]/g, kv)
					: tmp + kv;
			}
		}

		return bail(name, target);
	}
}

type LegacyOptions = {
	fields?: string[];
	browser?: string | boolean;
}

export function legacy(pkg: Package, options: LegacyOptions = {}): Subpath | Browser | void {
	let i=0,
		value: Package['module' | 'main' | 'browser'],
		browser = options.browser,
		fields = options.fields || ['module', 'main'];

	if (browser && !fields.includes('browser')) {
		fields.unshift('browser');
	}

	for (; i < fields.length; i++) {
		if (value = pkg[fields[i]]) {
			if (typeof value == 'string') {
				//
			} else if (typeof value == 'object' && fields[i] == 'browser') {
				if (typeof browser == 'string') {
					value = value[browser=toName(pkg.name, browser)];
					if (value == null) return browser as Subpath;
				}
			} else {
				continue;
			}

			return typeof value == 'string'
				? ('./' + value.replace(/^\.?\//, '')) as Subpath
				: value;
		}
	}
}
