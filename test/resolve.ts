import { suite } from 'uvu';
import * as assert from 'uvu/assert';
import * as lib from '../src';

import type { Package, Exports, Options } from 'resolve.exports';

function pass(pkg: Package, expects: Exports.Entry, entry?: string, options?: Options) {
	let out = lib.resolve(pkg, entry, options);
	assert.is(out, expects);
}

function fail(pkg: Package, target: Exports.Entry, entry?: string, options?: Options) {
	try {
		lib.resolve(pkg, entry, options);
		assert.unreachable();
	} catch (err) {
		assert.instance(err, Error);
		assert.is((err as Error).message, `Missing "${target}" export in "${pkg.name}" package`);
	}
}

// ---

const resolve = suite('$.resolve');

resolve('should be a function', () => {
	assert.type(lib.resolve, 'function');
});

resolve('exports=string', () => {
	let pkg: Package = {
		"name": "foobar",
		"exports": "./$string",
	};

	pass(pkg, './$string');
	pass(pkg, './$string', '.');
	pass(pkg, './$string', 'foobar');

	fail(pkg, './other', 'other');
	fail(pkg, './other', 'foobar/other');
	fail(pkg, './hello', './hello');
});

resolve('exports = { self }', () => {
	let pkg: Package = {
		"name": "foobar",
		"exports": {
			"import": "./$import",
			"require": "./$require",
		}
	};

	pass(pkg, './$import');
	pass(pkg, './$import', '.');
	pass(pkg, './$import', 'foobar');

	fail(pkg, './other', 'other');
	fail(pkg, './other', 'foobar/other');
	fail(pkg, './hello', './hello');
});

resolve('exports["."] = string', () => {
	let pkg: Package = {
		"name": "foobar",
		"exports": {
			".": "./$self",
		}
	};

	pass(pkg, './$self');
	pass(pkg, './$self', '.');
	pass(pkg, './$self', 'foobar');

	fail(pkg, './other', 'other');
	fail(pkg, './other', 'foobar/other');
	fail(pkg, './hello', './hello');
});

resolve('exports["."] = object', () => {
	let pkg: Package = {
		"name": "foobar",
		"exports": {
			".": {
				"import": "./$import",
				"require": "./$require",
			}
		}
	};

	pass(pkg, './$import');
	pass(pkg, './$import', '.');
	pass(pkg, './$import', 'foobar');

	fail(pkg, './other', 'other');
	fail(pkg, './other', 'foobar/other');
	fail(pkg, './hello', './hello');
});

resolve('exports["./foo"] = string', () => {
	let pkg: Package = {
		"name": "foobar",
		"exports": {
			"./foo": "./$import",
		}
	};

	pass(pkg, './$import', './foo');
	pass(pkg, './$import', 'foobar/foo');

	fail(pkg, '.');
	fail(pkg, '.', 'foobar');
	fail(pkg, './other', 'foobar/other');
});

resolve('exports["./foo"] = object', () => {
	let pkg: Package = {
		"name": "foobar",
		"exports": {
			"./foo": {
				"import": "./$import",
				"require": "./$require",
			}
		}
	};

	pass(pkg, './$import', './foo');
	pass(pkg, './$import', 'foobar/foo');

	fail(pkg, '.');
	fail(pkg, '.', 'foobar');
	fail(pkg, './other', 'foobar/other');
});

// https://nodejs.org/api/packages.html#packages_nested_conditions
resolve('nested conditions', () => {
	let pkg: Package = {
		"name": "foobar",
		"exports": {
			"node": {
				"import": "././$node.import",
				"require": "././$node.require"
			},
			"default": "./$default",
		}
	};

	pass(pkg, '././$node.import');
	pass(pkg, '././$node.import', 'foobar');

	// browser => no "node" key
	pass(pkg, './$default', '.', { browser: true });
	pass(pkg, './$default', 'foobar', { browser: true });

	fail(pkg, './hello', './hello');
	fail(pkg, './other', 'foobar/other');
	fail(pkg, './other', 'other');
});

resolve('nested conditions :: subpath', () => {
	let pkg: Package = {
		"name": "foobar",
		"exports": {
			"./lite": {
				"node": {
					"import": "././$node.import",
					"require": "././$node.require"
				},
				"browser": {
					"import": "././$browser.import",
					"require": "././$browser.require"
				},
			}
		}
	};

	pass(pkg, '././$node.import', 'foobar/lite');
	pass(pkg, '././$node.require', 'foobar/lite', { require: true });

	pass(pkg, '././$browser.import', 'foobar/lite', { browser: true });
	pass(pkg, '././$browser.require', 'foobar/lite', { browser: true, require: true });
});

resolve('nested conditions :: subpath :: inverse', () => {
	let pkg: Package = {
		"name": "foobar",
		"exports": {
			"./lite": {
				"import": {
					"browser": "././$browser.import",
					"node": "././$node.import",
				},
				"require": {
					"browser": "././$browser.require",
					"node": "././$node.require",
				}
			}
		}
	};

	pass(pkg, '././$node.import', 'foobar/lite');
	pass(pkg, '././$node.require', 'foobar/lite', { require: true });

	pass(pkg, '././$browser.import', 'foobar/lite', { browser: true });
	pass(pkg, '././$browser.require', 'foobar/lite', { browser: true, require: true });
});

// https://nodejs.org/api/packages.html#packages_subpath_folder_mappings
resolve('exports["./"]', () => {
	let pkg: Package = {
		"name": "foobar",
		"exports": {
			".": {
				"require": "./$require",
				"import": "./$import"
			},
			"./package.json": "./package.json",
			"./": "./"
		}
	};

	pass(pkg, './$import');
	pass(pkg, './$import', 'foobar');
	pass(pkg, './$require', 'foobar', { require: true });

	pass(pkg, './package.json', 'package.json');
	pass(pkg, './package.json', 'foobar/package.json');
	pass(pkg, './package.json', './package.json');

	// "loose" / everything exposed
	pass(pkg, './hello.js', 'hello.js');
	pass(pkg, './hello.js', 'foobar/hello.js');
	pass(pkg, './hello/world.js', './hello/world.js');
});

resolve('exports["./"] :: w/o "." key', () => {
	let pkg: Package = {
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
	let pkg: Package = {
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

resolve('exports["./dir*"]', () => {
	let pkg: Package = {
		"name": "foobar",
		"exports": {
			"./dir*": "./cheese/*.mjs"
		}
	};

	fail(pkg, '.', ".");
	fail(pkg, '.', "foobar");

	pass(pkg, './cheese/test.mjs', 'dirtest');
	pass(pkg, './cheese/test.mjs', 'foobar/dirtest');

	pass(pkg, './cheese/test/wheel.mjs', 'dirtest/wheel');
	pass(pkg, './cheese/test/wheel.mjs', 'foobar/dirtest/wheel');
});

// https://github.com/lukeed/resolve.exports/issues/9
resolve('exports["./dir*"] :: repeat "*" value', () => {
	let pkg: Package = {
		"name": "foobar",
		"exports": {
			"./dir*": "./*sub/dir*/file.js"
		}
	};

	fail(pkg, '.', ".");
	fail(pkg, '.', "foobar");

	pass(pkg, './testsub/dirtest/file.js', 'dirtest');
	pass(pkg, './testsub/dirtest/file.js', 'foobar/dirtest');

	pass(pkg, './test/innersub/dirtest/inner/file.js', 'dirtest/inner');
	pass(pkg, './test/innersub/dirtest/inner/file.js', 'foobar/dirtest/inner');
});

resolve('exports["./dir*"] :: share "name" start', () => {
	let pkg: Package = {
		"name": "director",
		"exports": {
			"./dir*": "./*sub/dir*/file.js"
		}
	};

	fail(pkg, '.', ".");
	fail(pkg, '.', "director");

	pass(pkg, './testsub/dirtest/file.js', 'dirtest');
	pass(pkg, './testsub/dirtest/file.js', 'director/dirtest');

	pass(pkg, './test/innersub/dirtest/inner/file.js', 'dirtest/inner');
	pass(pkg, './test/innersub/dirtest/inner/file.js', 'director/dirtest/inner');
});

/**
 * @deprecated Documentation-only deprecation in Node 14.13
 * @deprecated Runtime deprecation in Node 16.0
 * @removed Removed in Node 18.0
 * @see https://nodejs.org/docs/latest-v16.x/api/packages.html#subpath-folder-mappings
 */
resolve('exports["./features/"]', () => {
	let pkg: Package = {
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
	let pkg: Package = {
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
	let pkg: Package = {
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
	let pkg: Package = {
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
	pass(pkg, './features/foo/bar.js', 'foobar/features/foo/bar');

	// Valid: Pattern trailers allow any exact substrings to be matched
	pass(pkg, './features/hello.js.js', 'foobar/features/hello.js');
	pass(pkg, './features/foo/bar.js.js', 'foobar/features/foo/bar.js');

	fail(pkg, './package.json', 'package.json');
	fail(pkg, './package.json', 'foobar/package.json');
	fail(pkg, './package.json', './package.json');
});

// https://nodejs.org/api/packages.html#packages_subpath_folder_mappings
resolve('exports["./features/*"] :: with "./" key', () => {
	let pkg: Package = {
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
	pass(pkg, './features/foo/bar.js', 'foobar/features/foo/bar');

	// Valid: Pattern trailers allow any exact substrings to be matched
	pass(pkg, './features/hello.js.js', 'foobar/features/hello.js');
	pass(pkg, './features/foo/bar.js.js', 'foobar/features/foo/bar.js');

	pass(pkg, './package.json', 'package.json');
	pass(pkg, './package.json', 'foobar/package.json');
	pass(pkg, './package.json', './package.json');

	// Does NOT hit "./" (match Node)
	fail(pkg, '.', '.');
	fail(pkg, '.', 'foobar');
});

// https://github.com/lukeed/resolve.exports/issues/7
resolve('exports["./features/*"] :: with "./" key first', () => {
	let pkg: Package = {
		"name": "foobar",
		"exports": {
			"./": "./",
			"./features/*": "./features/*.js"
		}
	};

	pass(pkg, './features', 'features'); // via "./"
	pass(pkg, './features', 'foobar/features'); // via "./"

	pass(pkg, './features/', 'features/'); // via "./"
	pass(pkg, './features/', 'foobar/features/'); // via "./"

	pass(pkg, './features/hello.js', 'foobar/features/hello');
	pass(pkg, './features/foo/bar.js', 'foobar/features/foo/bar');

	// Valid: Pattern trailers allow any exact substrings to be matched
	pass(pkg, './features/hello.js.js', 'foobar/features/hello.js');
	pass(pkg, './features/foo/bar.js.js', 'foobar/features/foo/bar.js');

	pass(pkg, './package.json', 'package.json');
	pass(pkg, './package.json', 'foobar/package.json');
	pass(pkg, './package.json', './package.json');

	// Does NOT hit "./" (match Node)
	fail(pkg, '.', '.');
	fail(pkg, '.', 'foobar');
});

// https://github.com/lukeed/resolve.exports/issues/16
resolve('exports["./features/*"] :: with `null` internals', () => {
	let pkg: Package = {
		"name": "foobar",
		"exports": {
			"./features/*": "./src/features/*.js",
			"./features/internal/*": null
		}
	};

	pass(pkg, './src/features/hello.js', 'features/hello');
	pass(pkg, './src/features/hello.js', 'foobar/features/hello');

	pass(pkg, './src/features/foo/bar.js', 'features/foo/bar');
	pass(pkg, './src/features/foo/bar.js', 'foobar/features/foo/bar');

	// TODO? Native throws `ERR_PACKAGE_PATH_NOT_EXPORTED`
	// Currently throwing `Missing "%s" export in "$s" package`
	fail(pkg, './features/internal/hello', 'features/internal/hello');
	fail(pkg, './features/internal/foo/bar', 'features/internal/foo/bar');
});

// https://github.com/lukeed/resolve.exports/issues/16
resolve('exports["./features/*"] :: with `null` internals first', () => {
	let pkg: Package = {
		"name": "foobar",
		"exports": {
			"./features/internal/*": null,
			"./features/*": "./src/features/*.js",
		}
	};

	pass(pkg, './src/features/hello.js', 'features/hello');
	pass(pkg, './src/features/hello.js', 'foobar/features/hello');

	pass(pkg, './src/features/foo/bar.js', 'features/foo/bar');
	pass(pkg, './src/features/foo/bar.js', 'foobar/features/foo/bar');

	// TODO? Native throws `ERR_PACKAGE_PATH_NOT_EXPORTED`
	// Currently throwing `Missing "%s" export in "$s" package`
	fail(pkg, './features/internal/hello', 'features/internal/hello');
	fail(pkg, './features/internal/foo/bar', 'features/internal/foo/bar');
});

// https://nodejs.org/docs/latest-v18.x/api/packages.html#package-entry-points
resolve('exports["./features/*"] :: with "./features/*.js" key', () => {
	let pkg: Package = {
		"name": "foobar",
		"exports": {
			"./features/*": "./features/*.js",
			"./features/*.js": "./features/*.js",
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
	pass(pkg, './features/hello.js', 'foobar/features/hello.js');

	pass(pkg, './features/foo/bar.js', 'foobar/features/foo/bar');
	pass(pkg, './features/foo/bar.js', 'foobar/features/foo/bar.js');

	fail(pkg, './package.json', 'package.json');
	fail(pkg, './package.json', 'foobar/package.json');
	fail(pkg, './package.json', './package.json');
});

resolve('exports["./features/*"] :: conditions', () => {
	let pkg: Package = {
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
	let pkg: Package = {
		"name": "foobar",
		"exports": {
			".": [
				{
					"import": "./$root.import",
				},
				"./$root.string"
			],
			"./foo": [
				{
					"require": "./$foo.require"
				},
				"./$foo.string"
			]
		}
	}

	pass(pkg, './$root.import');
	pass(pkg, './$root.import', 'foobar');

	pass(pkg, './$foo.string', 'foo');
	pass(pkg, './$foo.string', 'foobar/foo');
	pass(pkg, './$foo.string', './foo');

	pass(pkg, './$foo.require', 'foo', { require: true });
	pass(pkg, './$foo.require', 'foobar/foo', { require: true });
	pass(pkg, './$foo.require', './foo', { require: true });
});

resolve('should handle file with leading dot', () => {
	let pkg: Package = {
		"version": "2.41.0",
		"name": "aws-cdk-lib",
		"exports": {
			".": "./index.js",
			"./package.json": "./package.json",
			"./.jsii": "./.jsii",
			"./.warnings.jsii.js": "./.warnings.jsii.js",
			"./alexa-ask": "./alexa-ask/index.js"
		}
	};

	pass(pkg, "./.warnings.jsii.js", ".warnings.jsii.js");
});

resolve.run();

// ---

const requires = suite<Package>('options.requires', {
	"name": "r",
	"exports": {
		"require": "./$require",
		"import": "./$import",
	}
});

requires('should ignore "require" keys by default', pkg => {
	pass(pkg, './$import');
});

requires('should use "require" key when defined first', pkg => {
	pass(pkg, './$require', '.', { require: true });
});

requires('should ignore "import" key when enabled', () => {
	let pkg: Package = {
		"name": "r",
		"exports": {
			"import": "./$import",
			"require": "./$require",
		}
	};
	pass(pkg, './$require', '.', { require: true });
	pass(pkg, './$import', '.');
});

requires('should match "default" if "require" is after', () => {
	let pkg: Package = {
		"name": "r",
		"exports": {
			"default": "./$default",
			"require": "./$require",
		}
	};
	pass(pkg, './$default', '.', { require: true });
});

requires.run();

// ---

const browser = suite<Package>('options.browser', {
	"name": "b",
	"exports": {
		"browser": "./$browser",
		"node": "./$node",
	}
});

browser('should ignore "browser" keys by default', pkg => {
	pass(pkg, './$node');
});

browser('should use "browser" key when defined first', pkg => {
	pass(pkg, './$browser', '.', { browser: true });
});

browser('should ignore "node" key when enabled', () => {
	let pkg: Package = {
		"name": "b",
		"exports": {
			"node": "./$node",
			"import": "./$import",
			"browser": "./$browser",
		}
	};
	// import defined before browser
	pass(pkg, './$import', '.', { browser: true });
});

browser.run();

// ---

const conditions = suite<Package>('options.conditions', {
	"name": "c",
	"exports": {
		"production": "./$prod",
		"development": "./$dev",
		"default": "./$default",
	}
});

conditions('should ignore unknown conditions by default', pkg => {
	pass(pkg, './$default');
});

conditions('should recognize custom field(s) when specified', pkg => {
	pass(pkg, './$dev', '.', {
		conditions: ['development']
	});

	pass(pkg, './$prod', '.', {
		conditions: ['development', 'production']
	});
});

conditions('should throw an error if no known conditions', ctx => {
	let pkg = {
		"name": "hello",
		"exports": {
			// @ts-ignore
			...ctx.exports
		},
	};

	delete pkg.exports.default;

	try {
		lib.resolve(pkg);
		assert.unreachable();
	} catch (err) {
		assert.instance(err, Error);
		assert.is((err as Error).message, `No known conditions for "." entry in "hello" package`);
	}
});

conditions.run();

// ---

const unsafe = suite<Package>('options.unsafe', {
	"name": "unsafe",
	"exports": {
		".": {
			"production": "./$prod",
			"development": "./$dev",
			"default": "./$default",
		},
		"./spec/type": {
			"import": "./$import",
			"require": "./$require",
			"default": "./$default"
		},
		"./spec/env": {
			"worker": {
				"default": "./$worker"
			},
			"browser": "./$browser",
			"node": "./$node",
			"default": "./$default"
		}
	}
});

unsafe('should ignore unknown conditions by default', pkg => {
	pass(pkg, './$default', '.', {
		unsafe: true,
	});
});

unsafe('should ignore "import" and "require" conditions by default', pkg => {
	pass(pkg, './$default', './spec/type', {
		unsafe: true,
	});

	pass(pkg, './$default', './spec/type', {
		unsafe: true,
		require: true,
	});
});

unsafe('should ignore "node" and "browser" conditions by default', pkg => {
	pass(pkg, './$default', './spec/type', {
		unsafe: true,
	});

	pass(pkg, './$default', './spec/type', {
		unsafe: true,
		browser: true,
	});
});

unsafe('should respect/accept any custom condition(s) when specified', pkg => {
	// root, dev only
	pass(pkg, './$dev', '.', {
		unsafe: true,
		conditions: ['development']
	});

	// root, defined order
	pass(pkg, './$prod', '.', {
		unsafe: true,
		conditions: ['development', 'production']
	});

	// import vs require, defined order
	pass(pkg, './$require', './spec/type', {
		unsafe: true,
		conditions: ['require']
	});

	// import vs require, defined order
	pass(pkg, './$import', './spec/type', {
		unsafe: true,
		conditions: ['import', 'require']
	});

	// import vs require, defined order
	pass(pkg, './$node', './spec/env', {
		unsafe: true,
		conditions: ['node']
	});

	// import vs require, defined order
	pass(pkg, './$browser', './spec/env', {
		unsafe: true,
		conditions: ['browser', 'node']
	});

	// import vs require, defined order
	pass(pkg, './$worker', './spec/env', {
		unsafe: true,
		conditions: ['browser', 'node', 'worker']
	});
});

unsafe.run();
