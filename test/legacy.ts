import { suite } from 'uvu';
import * as assert from 'uvu/assert';
import * as $exports from '../src';

import type { Package } from '../src';

const legacy = suite('$.legacy');

legacy('should be a function', () => {
	assert.type($exports.legacy, 'function');
});

legacy('should prefer "module" > "main" entry', () => {
	let pkg: Package = {
		"name": "foobar",
		"module": "build/module.js",
		"main": "build/main.js",
	};

	let output = $exports.legacy(pkg);
	assert.is(output, './build/module.js');
});

legacy('should read "main" field', () => {
	let pkg: Package = {
		"name": "foobar",
		"main": "build/main.js",
	};

	let output = $exports.legacy(pkg);
	assert.is(output, './build/main.js');
});

legacy('should return nothing when no fields', () => {
	let pkg: Package = {
		"name": "foobar"
	};

	let output = $exports.legacy(pkg);
	assert.is(output, undefined);
});

legacy('should ignore boolean-type field values', () => {
	let pkg = {
		"module": true,
		"main": "main.js"
	};

	let output = $exports.legacy(pkg as any);
	assert.is(output, './main.js');
});

legacy.run();

// ---

const fields = suite<Package>('options.fields', {
	"name": "foobar",
	"module": "build/module.js",
	"browser": "build/browser.js",
	"custom": "build/custom.js",
	"main": "build/main.js",
});

fields('should customize field search order', pkg => {
	let output = $exports.legacy(pkg);
	assert.is(output, './build/module.js', 'default: module');

	output = $exports.legacy(pkg, { fields: ['main'] });
	assert.is(output, './build/main.js', 'custom: main only');

	output = $exports.legacy(pkg, { fields: ['custom', 'main', 'module'] });
	assert.is(output, './build/custom.js', 'custom: custom > main > module');
});

fields('should return first *resolved* field', pkg => {
	let output = $exports.legacy(pkg, {
		fields: ['howdy', 'partner', 'hello', 'world', 'main']
	});

	assert.is(output, './build/main.js');
});

fields.run();

// ---

const browser = suite<Package>('options.browser', {
	"name": "foobar",
	"module": "build/module.js",
	"browser": "build/browser.js",
	"unpkg": "build/unpkg.js",
	"main": "build/main.js",
});

browser('should prioritize "browser" field when defined', pkg => {
	let output = $exports.legacy(pkg);
	assert.is(output, './build/module.js');

	output = $exports.legacy(pkg, { browser: true });
	assert.is(output, './build/browser.js');
});

browser('should respect existing "browser" order in custom fields', pkg => {
	let output = $exports.legacy(pkg, {
		fields: ['main', 'browser'],
		browser: true,
	});

	assert.is(output, './build/main.js');
});

// https://github.com/defunctzombie/package-browser-field-spec
browser('should resolve object format', () => {
	let pkg: Package = {
		"name": "foobar",
		"browser": {
			"module-a": "./shims/module-a.js",
			"./server/only.js": "./shims/client-only.js"
		}
	};

	assert.is(
		$exports.legacy(pkg, { browser: 'module-a' }),
		'./shims/module-a.js'
	);

	assert.is(
		$exports.legacy(pkg, { browser: './server/only.js' }),
		'./shims/client-only.js'
	);

	assert.is(
		$exports.legacy(pkg, { browser: 'foobar/server/only.js' }),
		'./shims/client-only.js'
	);
});

browser('should allow object format to "ignore" modules/files :: string', () => {
	let pkg: Package = {
		"name": "foobar",
		"browser": {
			"module-a": false,
			"./foo.js": false,
		}
	};

	assert.is(
		$exports.legacy(pkg, { browser: 'module-a' }),
		false
	);

	assert.is(
		$exports.legacy(pkg, { browser: './foo.js' }),
		false
	);

	assert.is(
		$exports.legacy(pkg, { browser: 'foobar/foo.js' }),
		false
	);
});

browser('should return the `browser` string (entry) if no custom mapping :: string', () => {
	let pkg: Package = {
		"name": "foobar",
		"browser": {
			//
		}
	};

	assert.is(
		$exports.legacy(pkg, {
			browser: './hello.js'
		}),
		'./hello.js'
	);

	assert.is(
		$exports.legacy(pkg, {
			browser: 'foobar/hello.js'
		}),
		'./hello.js'
	);
});

browser('should return the full "browser" object :: true', () => {
	let pkg: Package = {
		"name": "foobar",
		"browser": {
			"./other.js": "./world.js"
		}
	};

	let output = $exports.legacy(pkg, {
		browser: true
	});

	assert.equal(output, pkg.browser);
});

browser('still ensures string output is made relative', () => {
	let pkg: Package = {
		"name": "foobar",
		"browser": {
			"./foo.js": "bar.js",
		}
	} as any;

	assert.is(
		$exports.legacy(pkg, {
			browser: './foo.js'
		}),
		'./bar.js'
	);

	assert.is(
		$exports.legacy(pkg, {
			browser: 'foobar/foo.js'
		}),
		'./bar.js'
	);
});

browser.run();
