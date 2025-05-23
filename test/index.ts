import * as uvu from 'uvu';
import * as assert from 'uvu/assert';
import * as lib from '../src/index';

import type * as t from 'resolve.exports';

type Package = t.Package;
type Entry = t.Exports.Entry | t.Imports.Entry;
type Options = t.Options;

function pass(pkg: Package, expects: string|string[], entry?: string, options?: Options) {
	let out = lib.resolve(pkg, entry, options);
	if (typeof expects === 'string') {
		assert.ok(Array.isArray(out));
		assert.is(out[0], expects);
		assert.is(out.length, 1);
	} else {
		// Array | null | undefined
		assert.equal(out, expects);
	}
}

function fail(pkg: Package, target: Entry, entry?: string, options?: Options) {
	try {
		lib.resolve(pkg, entry, options);
		assert.unreachable();
	} catch (err) {
		assert.instance(err, Error);
		assert.is((err as Error).message, `Missing "${target}" specifier in "${pkg.name}" package`);
	}
}

function describe(
	name: string,
	cb: (it: uvu.Test) => void
) {
	let t = uvu.suite(name);
	cb(t);
	t.run();
}

// ---

describe('$.resolve', it => {
	it('should be a function', () => {
		assert.type(lib.resolve, 'function');
	});

	it('should return nothing if no maps', () => {
		let output = lib.resolve({
			"name": "foobar"
		});
		assert.is(output, undefined);
	});

	it('should default to `$.exports` handler', () => {
		let pkg: Package = {
			"name": "foobar",
			"exports": "./hello.mjs"
		};

		let output = lib.resolve(pkg);
		assert.equal(output, ['./hello.mjs']);

		output = lib.resolve(pkg, '.');
		assert.equal(output, ['./hello.mjs']);

		try {
			lib.resolve(pkg, './other');
			assert.unreachable();
		} catch (err) {
			assert.instance(err, Error);
			assert.is((err as Error).message, `Missing "./other" specifier in "foobar" package`);
		}
	});

	it('should run `$.imports` if given #ident', () => {
		let pkg: Package = {
			"name": "foobar",
			"imports": {
				"#foo": "./foo.mjs"
			}
		};

		let output = lib.resolve(pkg, '#foo');
		assert.equal(output, ['./foo.mjs']);

		output = lib.resolve(pkg, 'foobar/#foo');
		assert.equal(output, ['./foo.mjs']);

		try {
			lib.resolve(pkg, '#bar');
			assert.unreachable();
		} catch (err) {
			assert.instance(err, Error);
			assert.is((err as Error).message, `Missing "#bar" specifier in "foobar" package`);
		}
	});

	it('should run `$.export` if given "external" identifier', () => {
		let pkg: Package = {
			"name": "foobar",
			"exports": {
				".": "./foo.mjs"
			}
		};

		try {
			lib.resolve(pkg, 'external');
			assert.unreachable();
		} catch (err) {
			assert.instance(err, Error);
			// IMPORTANT: treats "external" as "./external"
			assert.is((err as Error).message, `Missing "./external" specifier in "foobar" package`);
		}
	});

	it('should run `$.export` if given "external/subpath" identifier', () => {
		let pkg: Package = {
			"name": "foobar",
			"exports": {
				".": "./foo.mjs"
			}
		};

		try {
			lib.resolve(pkg, 'external/subpath');
			assert.unreachable();
		} catch (err) {
			assert.instance(err, Error);
			// IMPORTANT: treats "external/subpath" as "./external/subpath"
			assert.is((err as Error).message, `Missing "./external/subpath" specifier in "foobar" package`);
		}
	});
});

describe('$.imports', it => {
	it('should be a function', () => {
		assert.type(lib.imports, 'function');
	});

	it('should return nothing if no "imports" map', () => {
		let pkg: Package = {
			"name": "foobar"
		};

		let output = lib.imports(pkg, '#any');
		assert.is(output, undefined);
	});

	it('imports["#foo"] = string', () => {
		let pkg: Package = {
			"name": "foobar",
			"imports": {
				"#foo": "./$import",
				"#bar": "module-a",
			}
		};

		pass(pkg, './$import', '#foo');
		pass(pkg, './$import', 'foobar/#foo');

		pass(pkg, 'module-a', '#bar');
		pass(pkg, 'module-a', 'foobar/#bar');

		fail(pkg, '#other', 'foobar/#other');
	});

	it('imports["#foo"] = object', () => {
		let pkg: Package = {
			"name": "foobar",
			"imports": {
				"#foo": {
					"import": "./$import",
					"require": "./$require",
				}
			}
		};

		pass(pkg, './$import', '#foo');
		pass(pkg, './$import', 'foobar/#foo');

		fail(pkg, '#other', 'foobar/#other');
	});

	it('nested conditions :: subpath', () => {
		let pkg: Package = {
			"name": "foobar",
			"imports": {
				"#lite": {
					"node": {
						"import": "./$node.import",
						"require": "./$node.require"
					},
					"browser": {
						"import": "./$browser.import",
						"require": "./$browser.require"
					},
				}
			}
		};

		pass(pkg, './$node.import', 'foobar/#lite');
		pass(pkg, './$node.require', 'foobar/#lite', { require: true });

		pass(pkg, './$browser.import', 'foobar/#lite', { browser: true });
		pass(pkg, './$browser.require', 'foobar/#lite', { browser: true, require: true });
	});

	it('nested conditions :: subpath :: inverse', () => {
		let pkg: Package = {
			"name": "foobar",
			"imports": {
				"#lite": {
					"import": {
						"browser": "./$browser.import",
						"node": "./$node.import",
					},
					"require": {
						"browser": "./$browser.require",
						"node": "./$node.require",
					}
				}
			}
		};

		pass(pkg, './$node.import', 'foobar/#lite');
		pass(pkg, './$node.require', 'foobar/#lite', { require: true });

		pass(pkg, './$browser.import', 'foobar/#lite', { browser: true });
		pass(pkg, './$browser.require', 'foobar/#lite', { browser: true, require: true });
	});

	// https://nodejs.org/api/packages.html#packages_subpath_folder_mappings
	it('imports["#key/*"]', () => {
		let pkg: Package = {
			"name": "foobar",
			"imports": {
				"#key/*": "./cheese/*.mjs"
			}
		};

		pass(pkg, './cheese/hello.mjs', 'foobar/#key/hello');
		pass(pkg, './cheese/hello/world.mjs', '#key/hello/world');

		// evaluate as defined, not wrong
		pass(pkg, './cheese/hello.js.mjs', '#key/hello.js');
		pass(pkg, './cheese/hello.js.mjs', 'foobar/#key/hello.js');
		pass(pkg, './cheese/hello/world.js.mjs', '#key/hello/world.js');
	});

	it('imports["#key/dir*"]', () => {
		let pkg: Package = {
			"name": "foobar",
			"imports": {
				"#key/dir*": "./cheese/*.mjs"
			}
		};

		pass(pkg, './cheese/test.mjs', '#key/dirtest');
		pass(pkg, './cheese/test.mjs', 'foobar/#key/dirtest');

		pass(pkg, './cheese/test/wheel.mjs', '#key/dirtest/wheel');
		pass(pkg, './cheese/test/wheel.mjs', 'foobar/#key/dirtest/wheel');
	});

	// https://github.com/lukeed/resolve.exports/issues/9
	it('imports["#key/dir*"] :: repeat "*" value', () => {
		let pkg: Package = {
			"name": "foobar",
			"imports": {
				"#key/dir*": "./*sub/dir*/file.js"
			}
		};

		pass(pkg, './testsub/dirtest/file.js', '#key/dirtest');
		pass(pkg, './testsub/dirtest/file.js', 'foobar/#key/dirtest');

		pass(pkg, './test/innersub/dirtest/inner/file.js', '#key/dirtest/inner');
		pass(pkg, './test/innersub/dirtest/inner/file.js', 'foobar/#key/dirtest/inner');
	});

	/**
	 * @deprecated Documentation-only deprecation in Node 14.13
	 * @deprecated Runtime deprecation in Node 16.0
	 * @removed Removed in Node 18.0
	 * @see https://nodejs.org/docs/latest-v16.x/api/packages.html#subpath-folder-mappings
	 */
	it('imports["#features/"]', () => {
		let pkg: Package = {
			"name": "foobar",
			"imports": {
				"#features/": "./features/"
			}
		};

		pass(pkg, './features/', '#features/');
		pass(pkg, './features/', 'foobar/#features/');

		pass(pkg, './features/hello.js', 'foobar/#features/hello.js');

		fail(pkg, '#features', '#features');
		fail(pkg, '#features', 'foobar/#features');
	});

	it('imports["#features/"] :: conditions', () => {
		let pkg: Package = {
			"name": "foobar",
			"imports": {
				"#features/": {
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
		pass(pkg, './import/', '#features/');
		pass(pkg, './import/', 'foobar/#features/');

		pass(pkg, './import/hello.js', '#features/hello.js');
		pass(pkg, './import/hello.js', 'foobar/#features/hello.js');

		// require
		pass(pkg, './require/', '#features/', { require: true });
		pass(pkg, './require/', 'foobar/#features/', { require: true });

		pass(pkg, './require/hello.js', '#features/hello.js', { require: true });
		pass(pkg, './require/hello.js', 'foobar/#features/hello.js', { require: true });

		// require + browser
		pass(pkg, './browser.require/', '#features/', { browser: true, require: true });
		pass(pkg, './browser.require/', 'foobar/#features/', { browser: true, require: true });

		pass(pkg, './browser.require/hello.js', '#features/hello.js', { browser: true, require: true });
		pass(pkg, './browser.require/hello.js', 'foobar/#features/hello.js', { browser: true, require: true });
	});

	// https://nodejs.org/api/packages.html#packages_subpath_folder_mappings
	it('imports["#features/*"]', () => {
		let pkg: Package = {
			"name": "foobar",
			"imports": {
				"#features/*": "./features/*.js",
			}
		};

		fail(pkg, '#features', '#features');
		fail(pkg, '#features', 'foobar/#features');

		fail(pkg, '#features/', '#features/');
		fail(pkg, '#features/', 'foobar/#features/');

		pass(pkg, './features/a.js', 'foobar/#features/a');
		pass(pkg, './features/ab.js', 'foobar/#features/ab');
		pass(pkg, './features/abc.js', 'foobar/#features/abc');

		pass(pkg, './features/hello.js', 'foobar/#features/hello');
		pass(pkg, './features/foo/bar.js', 'foobar/#features/foo/bar');

		// Valid: Pattern trailers allow any exact substrings to be matched
		pass(pkg, './features/hello.js.js', 'foobar/#features/hello.js');
		pass(pkg, './features/foo/bar.js.js', 'foobar/#features/foo/bar.js');
	});

	// https://nodejs.org/api/packages.html#packages_subpath_folder_mappings
	it('imports["#fooba*"] :: with "#foo*" key', () => {
		let pkg: Package = {
			"name": "foobar",
			"imports": {
				"#fooba*": "./features/*.js",
				"#foo*": "./"
			}
		};

		pass(pkg, './features/r.js', '#foobar');
		pass(pkg, './features/r.js', 'foobar/#foobar');

		pass(pkg, './features/r/hello.js', 'foobar/#foobar/hello');
		pass(pkg, './features/r/foo/bar.js', 'foobar/#foobar/foo/bar');

		// Valid: Pattern trailers allow any exact substrings to be matched
		pass(pkg, './features/r/hello.js.js', 'foobar/#foobar/hello.js');
		pass(pkg, './features/r/foo/bar.js.js', 'foobar/#foobar/foo/bar.js');
	});

	// https://github.com/lukeed/resolve.exports/issues/7
	it('imports["#fooba*"] :: with "#foo*" key first', () => {
		let pkg: Package = {
			"name": "foobar",
			"imports": {
				"#foo*": "./",
				"#fooba*": "./features/*.js"
			}
		};

		pass(pkg, './features/r.js', '#foobar');
		pass(pkg, './features/r.js', 'foobar/#foobar');

		pass(pkg, './features/r/hello.js', 'foobar/#foobar/hello');
		pass(pkg, './features/r/foo/bar.js', 'foobar/#foobar/foo/bar');

		// Valid: Pattern trailers allow any exact substrings to be matched
		pass(pkg, './features/r/hello.js.js', 'foobar/#foobar/hello.js');
		pass(pkg, './features/r/foo/bar.js.js', 'foobar/#foobar/foo/bar.js');
	});

	// https://github.com/lukeed/resolve.exports/issues/27
	it('imports["#*"] :: with "#foo*" key', () => {
		let pkg: Package = {
			"name": "foobar",
			"imports": {
				"#*": "./root/*.js",
				"#foo*": "./foo/*.js"
			}
		};

		// "#foo*"
		pass(pkg, './foo/bar.js', '#foobar');
		pass(pkg, './foo/bar.js', 'foobar/#foobar');

		pass(pkg, './foo/bar/hello.js', 'foobar/#foobar/hello');
		pass(pkg, './foo/bar/foo/bar.js', 'foobar/#foobar/foo/bar');

		// Valid: Pattern trailers allow any exact substrings to be matched
		pass(pkg, './foo/bar/hello.js.js', 'foobar/#foobar/hello.js');
		pass(pkg, './foo/bar/foo/bar.js.js', 'foobar/#foobar/foo/bar.js');

		// "#*"
		pass(pkg, './root/other.js', '#other');
		pass(pkg, './root/other.js', 'foobar/#other');

		pass(pkg, './root/other/hello.js', 'foobar/#other/hello');
		pass(pkg, './root/other/foo/bar.js', 'foobar/#other/foo/bar');

		// Valid: Pattern trailers allow any exact substrings to be matched
		pass(pkg, './root/other/hello.js.js', 'foobar/#other/hello.js');
		pass(pkg, './root/other/foo/bar.js.js', 'foobar/#other/foo/bar.js');
	});

	// https://github.com/lukeed/resolve.exports/issues/27
	it('imports["#*"] :: with "#foo*" key first', () => {
		let pkg: Package = {
			"name": "foobar",
			"imports": {
				"#foo*": "./foo/*.js",
				"#*": "./root/*.js"
			}
		};

		// "#foo*"
		pass(pkg, './foo/bar.js', '#foobar');
		pass(pkg, './foo/bar.js', 'foobar/#foobar');

		pass(pkg, './foo/bar/hello.js', 'foobar/#foobar/hello');
		pass(pkg, './foo/bar/foo/bar.js', 'foobar/#foobar/foo/bar');

		// Valid: Pattern trailers allow any exact substrings to be matched
		pass(pkg, './foo/bar/hello.js.js', 'foobar/#foobar/hello.js');
		pass(pkg, './foo/bar/foo/bar.js.js', 'foobar/#foobar/foo/bar.js');

		// "#*"
		pass(pkg, './root/other.js', '#other');
		pass(pkg, './root/other.js', 'foobar/#other');

		pass(pkg, './root/other/hello.js', 'foobar/#other/hello');
		pass(pkg, './root/other/foo/bar.js', 'foobar/#other/foo/bar');

		// Valid: Pattern trailers allow any exact substrings to be matched
		pass(pkg, './root/other/hello.js.js', 'foobar/#other/hello.js');
		pass(pkg, './root/other/foo/bar.js.js', 'foobar/#other/foo/bar.js');
	});

	it('imports["#*"] :: with "#a" static key', () => {
		let pkg: Package = {
			"name": "foobar",
			"imports": {
				"#*": "./root/*.js",
				"#a": "./a.js",
			}
		};

		pass(pkg, './root/other.js', '#other');
		pass(pkg, './root/other.js', 'foobar/#other');

		pass(pkg, './a.js', '#a');
		pass(pkg, './a.js', 'foobar/#a');
	});

	it('imports["#*"] :: with "#a" static key first', () => {
		let pkg: Package = {
			"name": "foobar",
			"imports": {
				"#a": "./a.js",
				"#*": "./root/*.js",
			}
		};

		pass(pkg, './root/other.js', '#other');
		pass(pkg, './root/other.js', 'foobar/#other');

		pass(pkg, './a.js', '#a');
		pass(pkg, './a.js', 'foobar/#a');
	});

	// https://github.com/lukeed/resolve.exports/issues/16
	it('imports["#features/*"] :: with `null` internals', () => {
		let pkg: Package = {
			"name": "foobar",
			"imports": {
				"#features/*": "./src/features/*.js",
				"#features/internal/*": null
			}
		};

		pass(pkg, './src/features/hello.js', '#features/hello');
		pass(pkg, './src/features/hello.js', 'foobar/#features/hello');

		pass(pkg, './src/features/foo/bar.js', '#features/foo/bar');
		pass(pkg, './src/features/foo/bar.js', 'foobar/#features/foo/bar');

		// TODO? Native throws `ERR_PACKAGE_PATH_NOT_EXPORTED`
		// Currently throwing `Missing "%s" specifier in "$s" package`
		fail(pkg, '#features/internal/hello', '#features/internal/hello');
		fail(pkg, '#features/internal/foo/bar', '#features/internal/foo/bar');
	});

	// https://github.com/lukeed/resolve.exports/issues/16
	it('imports["#features/*"] :: with `null` internals first', () => {
		let pkg: Package = {
			"name": "foobar",
			"imports": {
				"#features/internal/*": null,
				"#features/*": "./src/features/*.js",
			}
		};

		pass(pkg, './src/features/hello.js', '#features/hello');
		pass(pkg, './src/features/hello.js', 'foobar/#features/hello');

		pass(pkg, './src/features/foo/bar.js', '#features/foo/bar');
		pass(pkg, './src/features/foo/bar.js', 'foobar/#features/foo/bar');

		// TODO? Native throws `ERR_PACKAGE_PATH_NOT_EXPORTED`
		// Currently throwing `Missing "%s" specifier in "$s" package`
		fail(pkg, '#features/internal/hello', '#features/internal/hello');
		fail(pkg, '#features/internal/foo/bar', '#features/internal/foo/bar');
	});

	// https://nodejs.org/docs/latest-v18.x/api/packages.html#package-entry-points
	it('imports["#features/*"] :: with "#features/*.js" key', () => {
		let pkg: Package = {
			"name": "foobar",
			"imports": {
				"#features/*": "./features/*.js",
				"#features/*.js": "./features/*.js",
			}
		};

		fail(pkg, '#features', '#features');
		fail(pkg, '#features', 'foobar/#features');

		fail(pkg, '#features/', '#features/');
		fail(pkg, '#features/', 'foobar/#features/');

		pass(pkg, './features/a.js', 'foobar/#features/a');
		pass(pkg, './features/ab.js', 'foobar/#features/ab');
		pass(pkg, './features/abc.js', 'foobar/#features/abc');

		pass(pkg, './features/hello.js', 'foobar/#features/hello');
		pass(pkg, './features/hello.js', 'foobar/#features/hello.js');

		pass(pkg, './features/foo/bar.js', 'foobar/#features/foo/bar');
		pass(pkg, './features/foo/bar.js', 'foobar/#features/foo/bar.js');
	});

	it('imports["#features/*"] :: conditions', () => {
		let pkg: Package = {
			"name": "foobar",
			"imports": {
				"#features/*": {
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
		fail(pkg, '#features/', '#features/'); // no file
		fail(pkg, '#features/', 'foobar/#features/'); // no file

		pass(pkg, './import/hello.mjs', '#features/hello');
		pass(pkg, './import/hello.mjs', 'foobar/#features/hello');

		// require
		fail(pkg, '#features/', '#features/', { require: true }); // no file
		fail(pkg, '#features/', 'foobar/#features/', { require: true }); // no file

		pass(pkg, './require/hello.js', '#features/hello', { require: true });
		pass(pkg, './require/hello.js', 'foobar/#features/hello', { require: true });

		// require + browser
		fail(pkg, '#features/', '#features/', { browser: true, require: true }); // no file
		fail(pkg, '#features/', 'foobar/#features/', { browser: true, require: true }); // no file

		pass(pkg, './browser.require/hello.js', '#features/hello', { browser: true, require: true });
		pass(pkg, './browser.require/hello.js', 'foobar/#features/hello', { browser: true, require: true });
	});

	it('should handle mixed path/conditions', () => {
		let pkg: Package = {
			"name": "foobar",
			"imports": {
				"#foo": [
					{
						"require": "./$foo.require"
					},
					"./$foo.string"
				]
			}
		};

		// TODO? if len==1 then single?
		pass(pkg, ['./$foo.string'], '#foo');
		pass(pkg, ['./$foo.string'], 'foobar/#foo');

		pass(pkg, ['./$foo.require', './$foo.string'], '#foo', { require: true });
		pass(pkg, ['./$foo.require', './$foo.string'], 'foobar/#foo', { require: true });
	});

	// https://github.com/lukeed/resolve.exports/issues/34
	it('imports["#features/*"] :: avoid lazy matching', () => {
		let pkg: Package = {
			name: 'test',
			imports: {
				'#features/*.css': './src/*.css',
    		'#features/*.ts': './src/*.ts',
			}
		};
		pass(pkg, './src/asdf/css.ts', '#features/asdf/css.ts');
	});

  it('imports["#features/*"] :: escape regexp', () => {
		let pkg: Package = {
			name: 'test',
			imports: {
				'#features/*.css': './src/*.css',
			}
		};
		fail(pkg, '#features/unexists.scss', '#features/unexists.scss');
	});

});

describe('$.exports', it => {
	it('should be a function', () => {
		assert.type(lib.exports, 'function');
	});

	it('should return nothing if no "exports" map', () => {
		let pkg: Package = {
			"name": "foobar"
		};

		let output = lib.exports(pkg, '#any');
		assert.is(output, undefined);
	});

	it('should default to "." target input', () => {
		let pkg: Package = {
			"name": "foobar",
			"exports": {
				".": "./hello.mjs"
			}
		};

		let output = lib.exports(pkg);
		assert.equal(output, ['./hello.mjs']);

		output = lib.exports(pkg, '.');
		assert.equal(output, ['./hello.mjs']);

		output = lib.exports(pkg, 'foobar');
		assert.equal(output, ['./hello.mjs']);
	});

	it('exports=string', () => {
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

	it('exports = { self }', () => {
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

	it('exports["."] = string', () => {
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

	it('exports["."] = object', () => {
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

	it('exports["./foo"] = string', () => {
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

	it('exports["./foo"] = object', () => {
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
	it('nested conditions', () => {
		let pkg: Package = {
			"name": "foobar",
			"exports": {
				"node": {
					"import": "./$node.import",
					"require": "./$node.require"
				},
				"default": "./$default",
			}
		};

		pass(pkg, './$node.import');
		pass(pkg, './$node.import', 'foobar');

		// browser => no "node" key
		pass(pkg, './$default', '.', { browser: true });
		pass(pkg, './$default', 'foobar', { browser: true });

		fail(pkg, './hello', './hello');
		fail(pkg, './other', 'foobar/other');
		fail(pkg, './other', 'other');
	});

	it('nested conditions :: subpath', () => {
		let pkg: Package = {
			"name": "foobar",
			"exports": {
				"./lite": {
					"node": {
						"import": "./$node.import",
						"require": "./$node.require"
					},
					"browser": {
						"import": "./$browser.import",
						"require": "./$browser.require"
					},
				}
			}
		};

		pass(pkg, './$node.import', 'foobar/lite');
		pass(pkg, './$node.require', 'foobar/lite', { require: true });

		pass(pkg, './$browser.import', 'foobar/lite', { browser: true });
		pass(pkg, './$browser.require', 'foobar/lite', { browser: true, require: true });
	});

	it('nested conditions :: subpath :: inverse', () => {
		let pkg: Package = {
			"name": "foobar",
			"exports": {
				"./lite": {
					"import": {
						"browser": "./$browser.import",
						"node": "./$node.import",
					},
					"require": {
						"browser": "./$browser.require",
						"node": "./$node.require",
					}
				}
			}
		};

		pass(pkg, './$node.import', 'foobar/lite');
		pass(pkg, './$node.require', 'foobar/lite', { require: true });

		pass(pkg, './$browser.import', 'foobar/lite', { browser: true });
		pass(pkg, './$browser.require', 'foobar/lite', { browser: true, require: true });
	});

	// https://nodejs.org/api/packages.html#packages_subpath_folder_mappings
	it('exports["./"]', () => {
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

	it('exports["./"] :: w/o "." key', () => {
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
	it('exports["./*"]', () => {
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

	it('exports["./dir*"]', () => {
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
	it('exports["./dir*"] :: repeat "*" value', () => {
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

	it('exports["./dir/*"] :: "*" value', () => {
		let pkg: Package = {
			"name": "foobar",
			"exports": {
				".": "./dir/index.js",
				"./dir": "./dir/index.js",
				"./dir/*": "./dir/index.js"
			}
		};

		pass(pkg, './dir/index.js', 'foobar');
		pass(pkg, './dir/index.js', 'foobar/dir');
		pass(pkg, './dir/index.js', 'foobar/dir/profile');
	});

	it('exports["./dir*"] :: share "name" start', () => {
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
	it('exports["./features/"]', () => {
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
	it('exports["./features/"] :: with "./" key', () => {
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

	it('exports["./features/"] :: conditions', () => {
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
	it('exports["./features/*"]', () => {
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
	it('exports["./features/*"] :: with "./" key', () => {
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
	it('exports["./features/*"] :: with "./" key first', () => {
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
	it('exports["./features/*"] :: with `null` internals', () => {
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
		// Currently throwing `Missing "%s" specifier in "$s" package`
		fail(pkg, './features/internal/hello', 'features/internal/hello');
		fail(pkg, './features/internal/foo/bar', 'features/internal/foo/bar');
	});

	// https://github.com/lukeed/resolve.exports/issues/16
	it('exports["./features/*"] :: with `null` internals first', () => {
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
		// Currently throwing `Missing "%s" specifier in "$s" package`
		fail(pkg, './features/internal/hello', 'features/internal/hello');
		fail(pkg, './features/internal/foo/bar', 'features/internal/foo/bar');
	});

	// https://nodejs.org/docs/latest-v18.x/api/packages.html#package-entry-points
	it('exports["./features/*"] :: with "./features/*.js" key', () => {
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

	it('exports["./features/*"] :: conditions', () => {
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

	it('should handle mixed path/conditions', () => {
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

		pass(pkg, ['./$root.import', './$root.string']);
		pass(pkg, ['./$root.import', './$root.string'], 'foobar');

		// TODO? if len==1 then single?
		pass(pkg, ['./$foo.string'], 'foo');
		pass(pkg, ['./$foo.string'], 'foobar/foo');
		pass(pkg, ['./$foo.string'], './foo');

		pass(pkg, ['./$foo.require', './$foo.string'], 'foo', { require: true });
		pass(pkg, ['./$foo.require', './$foo.string'], 'foobar/foo', { require: true });
		pass(pkg, ['./$foo.require', './$foo.string'], './foo', { require: true });
	});

	it('should handle file with leading dot', () => {
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
});

describe('options.requires', it => {
	let pkg: Package = {
		"name": "r",
		"exports": {
			"require": "./$require",
			"import": "./$import",
		}
	};

	it('should ignore "require" keys by default', () => {
		pass(pkg, './$import');
	});

	it('should use "require" key when defined first', () => {
		pass(pkg, './$require', '.', { require: true });
	});

	it('should ignore "import" key when enabled', () => {
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

	it('should match "default" if "require" is after', () => {
		let pkg: Package = {
			"name": "r",
			"exports": {
				"default": "./$default",
				"require": "./$require",
			}
		};
		pass(pkg, './$default', '.', { require: true });
	});
});

describe('options.browser', it => {
	let pkg: Package = {
		"name": "b",
		"exports": {
			"browser": "./$browser",
			"node": "./$node",
		}
	};

	it('should ignore "browser" keys by default', () => {
		pass(pkg, './$node');
	});

	it('should use "browser" key when defined first', () => {
		pass(pkg, './$browser', '.', { browser: true });
	});

	it('should ignore "node" key when enabled', () => {
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
});

describe('options.conditions', it => {
	const pkg: Package = {
		"name": "c",
		"exports": {
			"production": "./$prod",
			"development": "./$dev",
			"default": "./$default",
		}
	};

	it('should ignore unknown conditions by default', () => {
		pass(pkg, './$default');
	});

	it('should recognize custom field(s) when specified', () => {
		pass(pkg, './$dev', '.', {
			conditions: ['development']
		});

		pass(pkg, './$prod', '.', {
			conditions: ['development', 'production']
		});
	});

	it('should throw an error if no known conditions', () => {
		let ctx: Package = {
			"name": "hello",
			"exports": {
				// @ts-ignore
				...pkg.exports
			},
		};

		// @ts-ignore
		delete ctx.exports.default;

		try {
			lib.resolve(ctx);
			assert.unreachable();
		} catch (err) {
			assert.instance(err, Error);
			assert.is((err as Error).message, `No known conditions for "." specifier in "hello" package`);
		}
	});
});

describe('options.unsafe', it => {
	let pkg: Package = {
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
	};

	it('should ignore unknown conditions by default', () => {
		pass(pkg, './$default', '.', {
			unsafe: true,
		});
	});

	it('should ignore "import" and "require" conditions by default', () => {
		pass(pkg, './$default', './spec/type', {
			unsafe: true,
		});

		pass(pkg, './$default', './spec/type', {
			unsafe: true,
			require: true,
		});
	});

	it('should ignore "node" and "browser" conditions by default', () => {
		pass(pkg, './$default', './spec/type', {
			unsafe: true,
		});

		pass(pkg, './$default', './spec/type', {
			unsafe: true,
			browser: true,
		});
	});

	it('should respect/accept any custom condition(s) when specified', () => {
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
});
