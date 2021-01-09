import { suite } from 'uvu';
import * as assert from 'uvu/assert';
import * as $exports from '../src';

function pass(pkg, expects, ...args) {
	let out = $exports.resolve(pkg, ...args);
	assert.is(out, expects);
}

function fail(pkg, target, ...args) {
	try {
		$exports.resolve(pkg, ...args);
		assert.unreachable();
	} catch (err) {
		assert.instance(err, Error);
		assert.is(err.message, `Missing "${target}" export in "${pkg.name}" package`);
	}
}

// ---

const resolve = suite('resolve');

resolve('should be a function', () => {
	assert.type($exports.resolve, 'function');
});

resolve('exports=string', () => {
	let pkg = {
		"name": "foobar",
		"exports": "$string",
	};

	pass(pkg, '$string');
	pass(pkg, '$string', '.');
	pass(pkg, '$string', 'foobar');

	fail(pkg, './other', 'other');
	fail(pkg, './other', 'foobar/other');
	fail(pkg, './hello', './hello');
});

resolve('exports = { self }', () => {
	let pkg = {
		"name": "foobar",
		"exports": {
			"import": "$import",
			"require": "$require",
		}
	};

	pass(pkg, '$import');
	pass(pkg, '$import', '.');
	pass(pkg, '$import', 'foobar');

	fail(pkg, './other', 'other');
	fail(pkg, './other', 'foobar/other');
	fail(pkg, './hello', './hello');
});

resolve('exports["."] = string', () => {
	let pkg = {
		"name": "foobar",
		"exports": {
			".": "$self",
		}
	};

	pass(pkg, '$self');
	pass(pkg, '$self', '.');
	pass(pkg, '$self', 'foobar');

	fail(pkg, './other', 'other');
	fail(pkg, './other', 'foobar/other');
	fail(pkg, './hello', './hello');
});

resolve('exports["."] = object', () => {
	let pkg = {
		"name": "foobar",
		"exports": {
			".": {
				"import": "$import",
				"require": "$require",
			}
		}
	};

	pass(pkg, '$import');
	pass(pkg, '$import', '.');
	pass(pkg, '$import', 'foobar');

	fail(pkg, './other', 'other');
	fail(pkg, './other', 'foobar/other');
	fail(pkg, './hello', './hello');
});

resolve('exports["./foo"] = string', () => {
	let pkg = {
		"name": "foobar",
		"exports": {
			"./foo": "$import",
		}
	};

	pass(pkg, '$import', './foo');
	pass(pkg, '$import', 'foobar/foo');

	fail(pkg, '.');
	fail(pkg, '.', 'foobar');
	fail(pkg, './other', 'foobar/other');
});

resolve('exports["./foo"] = object', () => {
	let pkg = {
		"name": "foobar",
		"exports": {
			"./foo": {
				"import": "$import",
				"require": "$require",
			}
		}
	};

	pass(pkg, '$import', './foo');
	pass(pkg, '$import', 'foobar/foo');

	fail(pkg, '.');
	fail(pkg, '.', 'foobar');
	fail(pkg, './other', 'foobar/other');
});

// https://nodejs.org/api/packages.html#packages_nested_conditions
resolve('nested conditions', () => {
	let pkg = {
		"name": "foobar",
		"exports": {
			"node": {
				"import": "$node.import",
				"require": "$node.require"
			},
			"default": "$default",
		}
	};

	pass(pkg, '$node.import');
	pass(pkg, '$node.import', 'foobar');

	// browser => no "node" key
	pass(pkg, '$default', '.', { browser: true });
	pass(pkg, '$default', 'foobar', { browser: true });

	fail(pkg, './hello', './hello');
	fail(pkg, './other', 'foobar/other');
	fail(pkg, './other', 'other');
});

// https://nodejs.org/api/packages.html#packages_subpath_folder_mappings
resolve('exports["./"]', () => {
	let pkg = {
		"name": "foobar",
		"exports": {
			".": {
				"require": "$require",
				"import": "$import"
			},
			"./package.json": "./package.json",
			"./": "./"
		}
	};

	pass(pkg, '$import');
	pass(pkg, '$import', 'foobar');
	pass(pkg, '$require', 'foobar', { requires: true });

	pass(pkg, './package.json', 'package.json');
	pass(pkg, './package.json', 'foobar/package.json');
	pass(pkg, './package.json', './package.json');

	// "loose" / everything exposed
	pass(pkg, './hello.js', 'hello.js');
	pass(pkg, './hello.js', 'foobar/hello.js');
	pass(pkg, './hello/world.js', './hello/world.js');
});

resolve('exports["./"] :: w/o "." key', () => {
	let pkg = {
		"name": "foobar",
		"exports": {
			"./package.json": "./package.json",
			"./": "./"
		}
	};

	fail(pkg, '.', ".");
	fail(pkg, '.', "foobar");

	pass(pkg, './package.json', 'package.json');
	pass(pkg, './package.json', 'foobar/package.json');
	pass(pkg, './package.json', './package.json');

	// "loose" / everything exposed
	pass(pkg, './hello.js', 'hello.js');
	pass(pkg, './hello.js', 'foobar/hello.js');
	pass(pkg, './hello/world.js', './hello/world.js');
});

// https://nodejs.org/api/packages.html#packages_subpath_folder_mappings
resolve('exports["./*"]', () => {
	let pkg = {
		"name": "foobar",
		"exports": {
			"./*": "./cheese/*.mjs"
		}
	};

	fail(pkg, '.', ".");
	fail(pkg, '.', "foobar");

	pass(pkg, './cheese/hello.mjs', 'hello');
	pass(pkg, './cheese/hello.mjs', 'foobar/hello');
	pass(pkg, './cheese/hello/world.mjs', './hello/world');

	// evaluate as defined, not wrong
	pass(pkg, './cheese/hello.js.mjs', 'hello.js');
	pass(pkg, './cheese/hello.js.mjs', 'foobar/hello.js');
	pass(pkg, './cheese/hello/world.js.mjs', './hello/world.js');
});

// https://nodejs.org/api/packages.html#packages_subpath_folder_mappings
resolve('exports["./features/"]', () => {
	let pkg = {
		"name": "foobar",
		"exports": {
			"./features/": "./features/"
		}
	};

	pass(pkg, './features/', 'features/');
	pass(pkg, './features/', 'foobar/features/');

	pass(pkg, './features/hello.js', 'foobar/features/hello.js');

	fail(pkg, './features', 'features');
	fail(pkg, './features', 'foobar/features');

	fail(pkg, './package.json', 'package.json');
	fail(pkg, './package.json', 'foobar/package.json');
	fail(pkg, './package.json', './package.json');
});

// https://nodejs.org/api/packages.html#packages_subpath_folder_mappings
resolve('exports["./features/"] :: with "./" key', () => {
	let pkg = {
		"name": "foobar",
		"exports": {
			"./features/": "./features/",
			"./package.json": "./package.json",
			"./": "./"
		}
	};

	pass(pkg, './features', 'features'); // via "./"
	pass(pkg, './features', 'foobar/features'); // via "./"

	pass(pkg, './features/', 'features/'); // via "./features/"
	pass(pkg, './features/', 'foobar/features/'); // via "./features/"

	pass(pkg, './features/hello.js', 'foobar/features/hello.js');

	pass(pkg, './package.json', 'package.json');
	pass(pkg, './package.json', 'foobar/package.json');
	pass(pkg, './package.json', './package.json');

	// Does NOT hit "./" (match Node)
	fail(pkg, '.', '.');
	fail(pkg, '.', 'foobar');
});

// https://nodejs.org/api/packages.html#packages_subpath_folder_mappings
resolve('exports["./features/*"]', () => {
	let pkg = {
		"name": "foobar",
		"exports": {
			"./features/*": "./features/*.js",
		}
	};

	fail(pkg, './features', 'features');
	fail(pkg, './features', 'foobar/features');

	fail(pkg, './features/', 'features/');
	fail(pkg, './features/', 'foobar/features/');

	pass(pkg, './features/hello.js', 'foobar/features/hello');
	pass(pkg, './features/world.js', 'foobar/features/world');

	// incorrect, but matches Node. evaluate as defined
	pass(pkg, './features/hello.js.js', 'foobar/features/hello.js');
	pass(pkg, './features/world.js.js', 'foobar/features/world.js');

	fail(pkg, './package.json', 'package.json');
	fail(pkg, './package.json', 'foobar/package.json');
	fail(pkg, './package.json', './package.json');
});

// https://nodejs.org/api/packages.html#packages_subpath_folder_mappings
resolve('exports["./features/*"] :: with "./" key', () => {
	let pkg = {
		"name": "foobar",
		"exports": {
			"./features/*": "./features/*.js",
			"./": "./"
		}
	};

	pass(pkg, './features', 'features'); // via "./"
	pass(pkg, './features', 'foobar/features'); // via "./"

	pass(pkg, './features/', 'features/'); // via "./"
	pass(pkg, './features/', 'foobar/features/'); // via "./"

	pass(pkg, './features/hello.js', 'foobar/features/hello');
	pass(pkg, './features/world.js', 'foobar/features/world');

	// incorrect, but matches Node. evaluate as defined
	pass(pkg, './features/hello.js.js', 'foobar/features/hello.js');
	pass(pkg, './features/world.js.js', 'foobar/features/world.js');

	pass(pkg, './package.json', 'package.json');
	pass(pkg, './package.json', 'foobar/package.json');
	pass(pkg, './package.json', './package.json');

	// Does NOT hit "./" (match Node)
	fail(pkg, '.', '.');
	fail(pkg, '.', 'foobar');
});

resolve('should handle mixed path/conditions', () => {
	let pkg = {
		"name": "foobar",
		"exports": {
			".": [
				{
					"import": "$root.import",
				},
				"$root.string"
			],
			"./foo": [
				{
					"require": "$foo.require"
				},
				"$foo.string"
			]
		}
	}

	pass(pkg, '$root.import');
	pass(pkg, '$root.import', 'foobar');

	pass(pkg, '$foo.string', 'foo');
	pass(pkg, '$foo.string', 'foobar/foo');
	pass(pkg, '$foo.string', './foo');

	pass(pkg, '$foo.require', 'foo', { requires: true });
	pass(pkg, '$foo.require', 'foobar/foo', { requires: true });
	pass(pkg, '$foo.require', './foo', { requires: true });
});

resolve.run();

// ---

const requires = suite('options.requires', {
	"exports": {
		"require": "$require",
		"import": "$import",
	}
});

requires('should ignore "require" keys by default', pkg => {
	pass(pkg, '$import');
});

requires('should use "require" key when defined first', pkg => {
	pass(pkg, '$require', '.', { requires: true });
});

requires.run();

// ---

const browser = suite('options.browser', {
	"exports": {
		"browser": "$browser",
		"node": "$node",
	}
});

browser('should ignore "browser" keys by default', pkg => {
	pass(pkg, '$node');
});

browser('should use "browser" key when defined first', pkg => {
	pass(pkg, '$browser', '.', { browser: true });
});

browser('should ignore "node" key when enabled', () => {
	let pkg = {
		"exports": {
			"node": "$node",
			"import": "$import",
			"browser": "$browser",
		}
	};
	// import defined before browser
	pass(pkg, '$import', '.', { browser: true });
});

browser.run();

// ---

const fields = suite('options.fields', {
	"exports": {
		"production": "$prod",
		"development": "$dev",
		"default": "$default",
	}
});

fields('should ignore unknown fields by default', pkg => {
	pass(pkg, '$default');
});

fields('should recognize custom field(s) when specified', pkg => {
	pass(pkg, '$dev', '.', {
		fields: ['development']
	});

	pass(pkg, '$prod', '.', {
		fields: ['development', 'production']
	});
});

fields('should throw an error if no known conditions', ctx => {
	let pkg = {
		"name": "hello",
		"exports": {
			...ctx.exports
		},
	};

	delete pkg.exports.default;

	try {
		$exports.resolve(pkg);
		assert.unreachable();
	} catch (err) {
		assert.instance(err, Error);
		assert.is(err.message, `No known conditions for "." entry in "hello" package`);
	}
});

fields.run();
