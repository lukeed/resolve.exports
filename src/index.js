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
 * @param {string} name the package name
 * @param {string} entry the target path/import
 */
function toName(name, entry) {
	return entry === name ? '.'
		: entry[0] === '.' ? entry
		: entry.replace(new RegExp('^' + name + '\/'), './');
}

const asterisks = /\*+/;
const asterisksg = /\*+/g;

/**
 * 
 * @param {string} request the request to match
 * @param {string} path module template path (ex dir/*.mjs)
 */
function asWildMatch(request, path) {
	if (!asterisks.test(path)) {
		return;
	}

	const tokens = path.split(asterisks);
	const last = tokens.pop();
	if (!request.endsWith(last)) {
		return false;
	}
	
	const first = tokens.shift();
	if (!request.startsWith(first)) {
		return false;
	}

	request = request.substring(first.length, request.length - last.length);

	let i, tmp;
	const values = [];
	while (tmp = tokens.shift()) {
		i = request.indexOf(tmp);

		// empty values are not allowed.
		if (i <= 0) {
			return;
		}

		values.push(request.substring(0, i));
		request = request.substring(i + tmp.length);
	}

	// empty values are not allowed.
	if (!request) {
		return false;
	}

	values.push(request);
	
	return values;
}

/**
 * @param {string} path module template path (ex dir/*.mjs)
 * @param {string[]} values replacements for wildcard placeholders
 */
function replaceWilds(path, values) {
	return path.replace(asterisksg, function () {
		return values.shift() || "";
	});
}

/**
 * @param {object} pkg package.json contents
 * @param {string} [entry] entry name or import path
 * @param {object} [options]
 * @param {boolean} [options.browser]
 * @param {boolean} [options.require]
 * @param {string[]} [options.conditions]
 * @param {boolean} [options.unsafe]
 */
export function resolve(pkg, entry='.', options={}) {
	let { name, exports } = pkg;

	if (exports) {
		let { browser, require, unsafe, conditions=[] } = options;

		let target = toName(name, entry);
		if (target[0] !== '.') target = './' + target;

		if (typeof exports === 'string') {
			return target === '.' ? exports : bail(name, target);
		}

		let allows = new Set(['default', ...conditions]);
		unsafe || allows.add(require ? 'require' : 'import');
		unsafe || allows.add(browser ? 'browser' : 'node');

		let key, tmp, wilds, isSingle=false;

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
				return (tmp = loop(exports[key], allows))
					? (tmp + target.substring(key.length))
					: bail(name, target, 1);
			}

			if (wilds = asWildMatch(target, key)) {
				return (tmp = loop(exports[key], allows))
					? replaceWilds(tmp, wilds)
					: bail(name, target, 1);
			}
		}

		return bail(name, target);
	}
}

/**
 * @param {object} pkg
 * @param {object} [options]
 * @param {string|boolean} [options.browser]
 * @param {string[]} [options.fields]
 */
export function legacy(pkg, options={}) {
	let i=0, value,
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
					if (value == null) return browser;
				}
			} else {
				continue;
			}

			return typeof value == 'string'
				? ('./' + value.replace(/^\.?\//, ''))
				: value;
		}
	}
}
