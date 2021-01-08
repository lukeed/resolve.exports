/**
 * @todo arrayable
 * @param {object} exports
 * @param {Set<string>} keys
 */
function loop(exports, keys) {
	if (typeof exports === 'string') {
		return exports;
	}

	if (exports) {
		for (let key in exports) {
			if (keys.has(key)) {
				return loop(exports[key], keys);
			}
		}
	}
}

/**
 * @param {string} name
 * @param {string} entry
 */
function bail(name, entry) {
	throw new Error(`Missing "${entry}" export in "${name}" package`);
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
			return isSelf && loop(exports, allows) || bail(name, target);
		}

		if (tmp = exports[target]) {
			if (tmp = loop(tmp, allows)) return tmp;
			throw new Error(`No valid keys for "${target}" entry in "${name}" package`);
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
