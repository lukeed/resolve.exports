/**
 * @param {object} exports
 * @param {Set<string>} keys
 */
function loop(exports, keys) {
	if (typeof exports === 'string') {
		return exports;
	}

	if (exports) {
		let idx, tmp;
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
 * @param {string} name The package name
 * @param {string} entry The target entry, eg "."
 * @param {number} [condition] Unmatched condition?
 */
function bail(name, entry, condition) {
	throw new Error(
		condition
		? `No known conditions for "${entry}" entry in "${name}" package`
		: `Missing "${entry}" export in "${name}" package`
	);
}

/**
 * @param {object} pkg package.json contents
 * @param {string} [entry] entry name or import path
 * @param {object} [options]
 * @param {boolean} [options.browser]
 * @param {boolean} [options.requires]
 * @param {string[]} [options.fields]
 */
export function resolve(pkg, entry='.', options={}) {
	let { name, exports } = pkg;

	if (exports) {
		let { browser, requires, fields=[] } = options;

		let target = entry === name ? '.'
			: entry[0] === '.' ? entry
			: entry.replace(new RegExp('^' + name + '\/'), './');

		if (target[0] !== '.') {
			target = './' + target;
		}

		if (typeof exports === 'string') {
			return target === '.' ? exports : bail(name, target);
		}

		let allows = new Set(['default', ...fields]);
		allows.add(requires ? 'require' : 'import');
		allows.add(browser ? 'browser' : 'node');

		let key, tmp, isSingle=false;

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

		for (key in exports) {
			tmp = key[key.length - 1];
			if (tmp === '/' && target.startsWith(key)) {
				return exports[key] + target.substring(key.length);
			}
			if (tmp === '*' && target.startsWith(key.slice(0, -1))) {
				// do not trigger if no *content* to inject
				if (tmp = target.substring(key.length - 1)) {
					return exports[key].replace('*', tmp);
				}
			}
		}

		return bail(name, target);
	}
}

/**
 * @param {object} pkg
 * @param {object} [options]
 * @param {boolean} [options.browser]
 * @param {string[]} [options.fields]
 */
export function legacy(pkg, options={}) {
	let i=0, tmp, fields = options.fields || ['module', 'main'];

	if (options.browser && !fields.includes('browser')) {
		fields.unshift('browser');
	}

	for (; i < fields.length; i++) {
		if ((tmp = pkg[fields[i]]) && typeof tmp === 'string') {
			return './' + tmp.replace(/^\.?\//, '');
		}
	}
}
