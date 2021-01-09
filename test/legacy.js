import { suite } from 'uvu';
import * as assert from 'uvu/assert';
import * as $exports from '../src';

const legacy = suite('legacy');

legacy('should be a function', () => {
	assert.type($exports.legacy, 'function');
});

legacy('should prefer "module" > "main" entry', () => {
	let pkg = {
		"name": "foobar",
		"module": "build/module.js",
		"main": "build/main.js",
	};

	let output = $exports.legacy(pkg);
	assert.is(output, './build/module.js');
});

legacy('should read "main" field', () => {
	let pkg = {
		"name": "foobar",
		"main": "build/main.js",
	};

	let output = $exports.legacy(pkg);
	assert.is(output, './build/main.js');
});

legacy('should return nothing when no fields', () => {
	let pkg = {
		"name": "foobar"
	};

	let output = $exports.legacy(pkg);
	assert.is(output, undefined);
});

legacy.run();

// ---

const fields = suite('options.fields', {
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

const browser = suite('options.browser', {
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

browser.run();
