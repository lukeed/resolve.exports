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
	const { name, exports } = pkg;
	const { browser, requires, fields } = options;

	if (exports) {
		let target = entry === name ? '.'
			: entry.charAt(0) === '.' ? entry
			: entry.replace(new RegExp('^' + name + '\/'), './');

		if (target.charAt(0) !== '.') {
			target = './' + target;
		}

		const isSelf = target === '.';
		if (typeof exports === 'string') {
			return isSelf ? exports : bail(name, target);
		}

		const allows = new Set(
			['import', 'default'].concat(fields || [])
		);

		if (requires) allows.add('require');
		allows.add(browser ? 'browser' : 'node');

		let key, tmp, isSingle=false;

		for (key in exports) {
			isSingle = key.charAt(0) !== '.';
			break;
		}

		if (isSingle) {
			return isSelf
				? loop(exports, allows) || bail(name, target, 1)
				: bail(name, target);
		}

		if (tmp = exports[target]) {
			return loop(tmp, allows) || bail(name, target, 1);
		}

		for (key in exports) {
			tmp = key.charAt(key.length - 1);
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
