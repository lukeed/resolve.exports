import { join } from 'path';

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

		// TODO: "./*"
		const isLoose = exports['./'];
		let key, isSingle = !isLoose;

		// might just not have "./" key
		if (isSingle) for (key in exports) {
			isSingle = key.charAt(0) !== '.';
			break;
		}

		if (isSingle) {
			return isSelf && loop(exports, allows) || bail(name, target);
		}

		let item = exports[target];
		// TODO: no known keys error
		if (item) return loop(item, allows);

		// NOTE: is only "./", may be other directory mappings
		// TODO: can now also have "./*"
		// @see https://nodejs.org/api/packages.html#packages_subpath_folder_mappings
		return isLoose ? join(isLoose, target) : bail(name, target);
	}
}
