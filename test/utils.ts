import * as uvu from 'uvu';
import * as assert from 'uvu/assert';
import * as $ from '../src/utils';

function describe(
	name: string,
	cb: (it: uvu.Test) => void
) {
	let t = uvu.suite(name);
	cb(t);
	t.run();
}

describe('utils.toEntry', it => {
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
