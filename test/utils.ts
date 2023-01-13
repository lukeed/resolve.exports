import * as uvu from 'uvu';
import * as assert from 'uvu/assert';
import * as $ from '../src/utils';

import type * as t from 'resolve.exports';

function describe(
	name: string,
	cb: (it: uvu.Test) => void
) {
	let t = uvu.suite(name);
	cb(t);
	t.run();
}

describe('$.toEntry', it => {
	const PKG = 'PACKAGE';
	const EXTERNAL = 'EXTERNAL';

	function run(input: string, expect: string, externals?: boolean) {
		// overloading not working -,-
		let output = externals ? $.toEntry(PKG, input, true) : $.toEntry(PKG, input);
		let msg = `"${input}" -> "${expect}"` + (externals ? ' (externals)' : '');
		assert.is(output, expect, msg);
	}

	it('should be a function', () => {
		assert.type($.toEntry, 'function');
	});

	it('PKG', () => {
		run(PKG, '.');
		run(PKG, '.', true);
	});

	it('.', () => {
		run('.', '.');
		run('.', '.', true);
	});

	it('./', () => {
		run('./', './');
		run('./', './', true);
	});

	it('#inner', () => {
		run('#inner', '#inner');
		run('#inner', '#inner', true);
	});

	it('./foo', () => {
		run('./foo', './foo');
		run('./foo', './foo', true);
	});

	it('foo', () => {
		run('foo', './foo'); // forces path by default
		run('foo', 'foo', true);
	});

	it('.ini', () => {
		run('.ini', './.ini'); // forces path by default
		run('.ini', '.ini', true);
	});

	// handle "import 'lib/lib';" case
	it('./PKG', () => {
		let input = './' + PKG;
		run(input, input);
		run(input, input, true);
	});

	it('PKG/subpath', () => {
		let input = PKG + '/other';
		run(input, './other');
		run(input, './other', true);
	});

	it('PKG/#inner', () => {
		let input = PKG + '/#inner';
		run(input, '#inner');
		run(input, '#inner', true);
	});

	it('PKG/.ini', () => {
		let input = PKG + '/.ini';
		run(input, './.ini');
		run(input, './.ini', true);
	});

	it('EXTERNAL', () => {
		run(EXTERNAL, './'+EXTERNAL); // forces path by default
		run(EXTERNAL, EXTERNAL, true);
	});
});

describe('$.loop', it => {
	const FILE = './file.js';
	const DEFAULT = './foobar.js';

	type Expect = string | string[] | null | undefined;
	function run(expect: Expect, map: t.Exports.Value, conditions?: string[]) {
		let output = $.loop(map, new Set([ 'default', ...conditions||[] ]));
		assert.equal(output, expect);
	}

	it('should be a function', () => {
		assert.type($.loop, 'function');
	});

	it('string', () => {
		run('./foo.mjs', './foo.mjs');
		// @ts-expect-error
		run('.', '.');
	});

	it('empties', () => {
		// @ts-expect-error
		run(undefined, '');
		run(undefined, null);
		run(undefined, []);
		run(undefined, {});
	});

	it('{ default }', () => {
		run(FILE, {
			default: FILE,
		});

		run(FILE, {
			other: './unknown.js',
			default: FILE,
		});

		run(undefined, {
			other: './unknown.js',
		});

		run(FILE, {
			foo: './foo.js',
			default: {
				bar: './bar.js',
				default: {
					baz: './baz.js',
					default: FILE,
				}
			}
		});
	});

	it('{ custom }', () => {
		let conditions = ['custom'];

		run(DEFAULT, {
			default: DEFAULT,
			custom: FILE,
		}, conditions);

		run(FILE, {
			custom: FILE,
			default: DEFAULT,
		}, conditions);

		run(undefined, {
			foo: './foo.js',
			bar: './bar.js',
		}, conditions);

		run(FILE, {
			foo: './foo.js',
			custom: {
				default: {
					custom: FILE,
					default: DEFAULT,
				}
			},
			default: {
				custom: './bar.js'
			}
		}, conditions);
	});

	it('[ string ]', () => {
		run(
			[DEFAULT, FILE],
			[DEFAULT, FILE]
		);

		run(undefined, [
			null,
		]);

		run(
			[DEFAULT, FILE],
			[null, DEFAULT, FILE]
		);

		run(
			[DEFAULT, FILE],
			[DEFAULT, null, FILE]
		);
	});

	it('[{ default }]', () => {
		run([DEFAULT, FILE], [
			{
				default: DEFAULT,
			},
			FILE
		]);

		run([FILE, DEFAULT], [
			FILE,
			null,
			{
				default: DEFAULT,
			},
		]);

		run([DEFAULT, FILE], [
			{
				default: {
					default: {
						default: DEFAULT,
					}
				}
			},
			null,
			FILE
		]);

		run([DEFAULT, FILE, './foo.js'], [
			{
				default: {
					default: DEFAULT,
				}
			},
			null,
			{
				default: {
					default: DEFAULT,
				}
			},
			FILE,
			{
				default: './foo.js'
			}
		]);
	});

	it('{ [mixed] }', () => {
		run([DEFAULT, FILE], {
			default: [DEFAULT, FILE]
		});

		run([DEFAULT, FILE], {
			default: [null, DEFAULT, FILE]
		});

		run([DEFAULT, FILE], {
			default: [null, {
				default: DEFAULT
			}, FILE]
		});

		run([FILE, DEFAULT], {
			default: {
				custom: [{
					default: [FILE, FILE, null, DEFAULT]
				}, null, DEFAULT, FILE]
			}
		}, ['custom']);

		run([DEFAULT, FILE], {
			default: {
				custom: [{
					custom: [DEFAULT, null],
					default: [FILE, FILE, null, DEFAULT]
				}, null, DEFAULT, FILE]
			}
		}, ['custom']);
	});
});
