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

const resolve = suite('$.resolve');

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

resolve('nested conditions :: subpath', () => {
	let pkg = {
		"name": "foobar",
		"exports": {
			"./lite": {
				"node": {
					"import": "$node.import",
					"require": "$node.require"
				},
				"browser": {
					"import": "$browser.import",
					"require": "$browser.require"
				},
			}
		}
	};

	pass(pkg, '$node.import', 'foobar/lite');
	pass(pkg, '$node.require', 'foobar/lite', { require: true });

	pass(pkg, '$browser.import', 'foobar/lite', { browser: true });
	pass(pkg, '$browser.require', 'foobar/lite', { browser: true, require: true });
});

resolve('nested conditions :: subpath :: inverse', () => {
	let pkg = {
		"name": "foobar",
		"exports": {
			"./lite": {
				"import": {
					"browser": "$browser.import",
					"node": "$node.import",
				},
				"require": {
					"browser": "$browser.require",
					"node": "$node.require",
				}
			}
		}
	};

	pass(pkg, '$node.import', 'foobar/lite');
	pass(pkg, '$node.require', 'foobar/lite', { require: true });

	pass(pkg, '$browser.import', 'foobar/lite', { browser: true });
	pass(pkg, '$browser.require', 'foobar/lite', { browser: true, require: true });
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
	pass(pkg, '$require', 'foobar', { require: true });

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

resolve('exports["./features/"] :: conditions', () => {
	let pkg = {
		"name": "foobar",
		"exports": {
			"./features/": {
				"browser": {
					"import": "./browser.import/",
					"require": "./browser.require/",
				},
				"import": "./import/",
				"require": "./require/",
			},
		}
	};

	// import
	pass(pkg, './import/', 'features/');
	pass(pkg, './import/', 'foobar/features/');

	pass(pkg, './import/hello.js', './features/hello.js');
	pass(pkg, './import/hello.js', 'foobar/features/hello.js');

	// require
	pass(pkg, './require/', 'features/', { require: true });
	pass(pkg, './require/', 'foobar/features/', { require: true });

	pass(pkg, './require/hello.js', './features/hello.js', { require: true });
	pass(pkg, './require/hello.js', 'foobar/features/hello.js', { require: true });

	// require + browser
	pass(pkg, './browser.require/', 'features/', { browser: true, require: true });
	pass(pkg, './browser.require/', 'foobar/features/', { browser: true, require: true });

	pass(pkg, './browser.require/hello.js', './features/hello.js', { browser: true, require: true });
	pass(pkg, './browser.require/hello.js', 'foobar/features/hello.js', { browser: true, require: true });
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

	pass(pkg, './features/a.js', 'foobar/features/a');
	pass(pkg, './features/ab.js', 'foobar/features/ab');
	pass(pkg, './features/abc.js', 'foobar/features/abc');

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

resolve('exports["./features/*"] :: with unsorted keys', () => {
	let pkg = {
		"name": "foobar",
		"exports": {
			"./features/*": "./features/*.js",
			"./": "./",
			"./features/data/*": "./features/data/*.json"
		}
	};

	pass(pkg, './features', 'features'); // via "./"
	pass(pkg, './features', 'foobar/features'); // via "./"

	pass(pkg, './features/', 'features/'); // via "./"
	pass(pkg, './features/', 'foobar/features/'); // via "./"

	pass(pkg, './features/hello.js', 'foobar/features/hello'); // via "./features/*"
	pass(pkg, './features/world.js', 'foobar/features/world'); // via "./features/*""

	pass(pkg, './features/data/hello.json', 'foobar/features/data/hello'); // via "./features/data/*"
	pass(pkg, './features/data/world.json', 'foobar/features/data/world'); // via "./features/data/*"

	pass(pkg, './package.json', 'package.json'); // via "./"
	pass(pkg, './package.json', 'foobar/package.json'); // via "./"
	pass(pkg, './package.json', './package.json'); // via "./"
});

resolve('exports["./features/*"] :: conditions', () => {
	let pkg = {
		"name": "foobar",
		"exports": {
			"./features/*": {
				"browser": {
					"import": "./browser.import/*.mjs",
					"require": "./browser.require/*.js",
				},
				"import": "./import/*.mjs",
				"require": "./require/*.js",
			},
		}
	};

	// import
	fail(pkg, './features/', 'features/'); // no file
	fail(pkg, './features/', 'foobar/features/'); // no file

	pass(pkg, './import/hello.mjs', './features/hello');
	pass(pkg, './import/hello.mjs', 'foobar/features/hello');

	// require
	fail(pkg, './features/', 'features/', { require: true }); // no file
	fail(pkg, './features/', 'foobar/features/', { require: true }); // no file

	pass(pkg, './require/hello.js', './features/hello', { require: true });
	pass(pkg, './require/hello.js', 'foobar/features/hello', { require: true });

	// require + browser
	fail(pkg, './features/', 'features/', { browser: true, require: true }); // no file
	fail(pkg, './features/', 'foobar/features/', { browser: true, require: true }); // no file

	pass(pkg, './browser.require/hello.js', './features/hello', { browser: true, require: true });
	pass(pkg, './browser.require/hello.js', 'foobar/features/hello', { browser: true, require: true });
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

	pass(pkg, '$foo.require', 'foo', { require: true });
	pass(pkg, '$foo.require', 'foobar/foo', { require: true });
	pass(pkg, '$foo.require', './foo', { require: true });
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
	pass(pkg, '$require', '.', { require: true });
});

requires('should ignore "import" key when enabled', () => {
	let pkg = {
		"exports": {
			"import": "$import",
			"require": "$require",
		}
	};
	pass(pkg, '$require', '.', { require: true });
	pass(pkg, '$import', '.');
});

requires('should match "default" if "require" is after', () => {
	let pkg = {
		"exports": {
			"default": "$default",
			"require": "$require",
		}
	};
	pass(pkg, '$default', '.', { require: true });
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

const conditions = suite('options.conditions', {
	"exports": {
		"production": "$prod",
		"development": "$dev",
		"default": "$default",
	}
});

conditions('should ignore unknown conditions by default', pkg => {
	pass(pkg, '$default');
});

conditions('should recognize custom field(s) when specified', pkg => {
	pass(pkg, '$dev', '.', {
		conditions: ['development']
	});

	pass(pkg, '$prod', '.', {
		conditions: ['development', 'production']
	});
});

conditions('should throw an error if no known conditions', ctx => {
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

conditions.run();
