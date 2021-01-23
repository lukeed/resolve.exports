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

function throws(code, msg) {
	let err = Error(msg);
	err.code = code;
	throw err;
}

/**
 * @param {string} name The package name
 * @param {string} entry The target entry, eg "."
 * @param {number} [condition] Unmatched condition?
 */
function missing(name, entry, condition) {
	throws('ERR_PACKAGE_PATH_NOT_EXPORTED', condition
		? `No known conditions for "${entry}" entry in "${name}" package`
		: `Missing "${entry}" export in "${name}" package`
	);
}

/**
 * @param {string} name The package name
 * @param {string} entry The target entry, eg "."
 * @param {string} value The resolved value
 * @returns {void|string}
 */
function validate(name, entry, value) {
	if (value[0] != '.' || value[1] != '/') throws('ERR_INVALID_PACKAGE_TARGET', `Invalid "${entry}" export in "${name}" package; targets must start with "./"`);
	// if (value[value.length - 1] == '/') throws('ERR_UNSUPPORTED_DIR_IMPORT', `Invalid "${entry}" export in "${name}" package; targets must not resolve to a directory`);
	return value;
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

/**
 * @param {object} pkg package.json contents
 * @param {string} [entry] entry name or import path
 * @param {object} [options]
 * @param {boolean} [options.browser]
 * @param {boolean} [options.require]
 * @param {string[]} [options.conditions]
 */
export function resolve(pkg, entry='.', options={}) {
	let { name, exports } = pkg;

	if (exports) {
		let { browser, require, conditions=[] } = options;

		let target = toName(name, entry);
		if (target[0] !== '.') target = './' + target;

		if (typeof exports === 'string') {
			return target === '.' ? exports : missing(name, target);
		}

		let allows = new Set(['default', ...conditions]);
		allows.add(require ? 'require' : 'import');
		allows.add(browser ? 'browser' : 'node');

		let key, tmp, isSingle=false;

		for (key in exports) {
			isSingle = key[0] !== '.';
			break;
		}

		if (isSingle) {
			if (target !== '.') return missing(name, target);
			tmp = loop(exports, allows) || missing(name, target, 1);
			return validate(name, target, tmp);
		}

		if (tmp = exports[target]) {
			tmp = loop(tmp, allows) || missing(name, target, 1);
			return validate(name, target, tmp);
		}

		for (key in exports) {
			tmp = key[key.length - 1];
			if (tmp === '/' && target.startsWith(key)) {
				tmp = loop(exports[key], allows) || missing(name, target, 1);
				return validate(name, target, tmp + target.substring(key.length));
			}
			if (tmp === '*' && target.startsWith(key.slice(0, -1))) {
				// do not trigger if no *content* to inject
				if (target.substring(key.length - 1).length > 0) {
					tmp = loop(exports[key], allows) || missing(name, target, 1);
					return validate(name, target, tmp.replace('*', target.substring(key.length - 1)));
				}
			}
		}

		return missing(name, target);
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
