import * as uvu from 'uvu';
import * as assert from 'uvu/assert';
import { legacy } from '../src/legacy';

import type { Package } from 'resolve.exports';

function describe(
	name: string,
	cb: (it: uvu.Test) => void
) {
	let t = uvu.suite(name);
	cb(t);
	t.run();
}

describe('lib.legacy', it => {
	it('should be a function', () => {
		assert.type(legacy, 'function');
	});

	it('should prefer "module" > "main" entry', () => {
		let pkg: Package = {
			"name": "foobar",
			"module": "build/module.js",
			"main": "build/main.js",
		};

		let output = legacy(pkg);
		assert.is(output, './build/module.js');
	});

	it('should read "main" field', () => {
		let pkg: Package = {
			"name": "foobar",
			"main": "build/main.js",
		};

		let output = legacy(pkg);
		assert.is(output, './build/main.js');
	});

	it('should return nothing when no fields', () => {
		let pkg: Package = {
			"name": "foobar"
		};

		let output = legacy(pkg);
		assert.is(output, undefined);
	});

	it('should ignore boolean-type field values', () => {
		let pkg = {
			"module": true,
			"main": "main.js"
		};

		let output = legacy(pkg as any);
		assert.is(output, './main.js');
	});
});

describe('options.fields', it => {
	let pkg: Package = {
		"name": "foobar",
		"module": "build/module.js",
		"browser": "build/browser.js",
		"custom": "build/custom.js",
		"main": "build/main.js",
	};

	it('should customize field search order', () => {
		let output = legacy(pkg);
		assert.is(output, './build/module.js', 'default: module');

		output = legacy(pkg, { fields: ['main'] });
		assert.is(output, './build/main.js', 'custom: main only');

		output = legacy(pkg, { fields: ['custom', 'main', 'module'] });
		assert.is(output, './build/custom.js', 'custom: custom > main > module');
	});

	it('should return first *resolved* field', () => {
		let output = legacy(pkg, {
			fields: ['howdy', 'partner', 'hello', 'world', 'main']
		});

		assert.is(output, './build/main.js');
	});
});

describe('options.browser', it => {
	let pkg: Package = {
		"name": "foobar",
		"module": "build/module.js",
		"browser": "build/browser.js",
		"unpkg": "build/unpkg.js",
		"main": "build/main.js",
	};

	it('should prioritize "browser" field when defined', () => {
		let output = legacy(pkg);
		assert.is(output, './build/module.js');

		output = legacy(pkg, { browser: true });
		assert.is(output, './build/browser.js');
	});

	it('should respect existing "browser" order in custom fields', () => {
		let output = legacy(pkg, {
			fields: ['main', 'browser'],
			browser: true,
		});

		assert.is(output, './build/main.js');
	});

	// https://github.com/defunctzombie/package-browser-field-spec
	it('should resolve object format', () => {
		let pkg: Package = {
			"name": "foobar",
			"browser": {
				"module-a": "./shims/module-a.js",
				"./server/only.js": "./shims/client-only.js"
			}
		};

		assert.is(
			legacy(pkg, { browser: 'module-a' }),
			'./shims/module-a.js'
		);

		assert.is(
			legacy(pkg, { browser: './server/only.js' }),
			'./shims/client-only.js'
		);

		assert.is(
			legacy(pkg, { browser: 'foobar/server/only.js' }),
			'./shims/client-only.js'
		);
	});

	it('should allow object format to "ignore" modules/files :: string', () => {
		let pkg: Package = {
			"name": "foobar",
			"browser": {
				"module-a": false,
				"./foo.js": false,
			}
		};

		assert.is(
			legacy(pkg, { browser: 'module-a' }),
			false
		);

		assert.is(
			legacy(pkg, { browser: './foo.js' }),
			false
		);

		assert.is(
			legacy(pkg, { browser: 'foobar/foo.js' }),
			false
		);
	});

	it('should return the `browser` string (entry) if no custom mapping :: string', () => {
		let pkg: Package = {
			"name": "foobar",
			"browser": {
				//
			}
		};

		assert.is(
			legacy(pkg, {
				browser: './hello.js'
			}),
			'./hello.js'
		);

		assert.is(
			legacy(pkg, {
				browser: 'foobar/hello.js'
			}),
			'./hello.js'
		);
	});

	it('should return the full "browser" object :: true', () => {
		let pkg: Package = {
			"name": "foobar",
			"browser": {
				"./other.js": "./world.js"
			}
		};

		let output = legacy(pkg, {
			browser: true
		});

		assert.equal(output, pkg.browser);
	});

	it('still ensures string output is made relative', () => {
		let pkg: Package = {
			"name": "foobar",
			"browser": {
				"./foo.js": "bar.js",
			}
		} as any;

		assert.is(
			legacy(pkg, {
				browser: './foo.js'
			}),
			'./bar.js'
		);

		assert.is(
			legacy(pkg, {
				browser: 'foobar/foo.js'
			}),
			'./bar.js'
		);
	});
});
