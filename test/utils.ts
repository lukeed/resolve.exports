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
	const PKG = 'foobar';
	const EXTERNAL = 'rollup';

	function run(input: string, expect: string, force?: boolean) {
		// @ts-expect-error; overload issue
		let output = $.toEntry(PKG, input, force);
		assert.type(output, 'string');
		assert.is(output, expect);
	}

	it('should be a function', () => {
		assert.type($.toEntry, 'function');
	});

	it('PKG -> .', () => {
		run(PKG, '.');
	});

	it('PKG -> . :: force', () => {
		run(PKG, '.', true);
	});

	it('. -> .', () => {
		run('.', '.');
	});

	it('. -> . :: force', () => {
		run('.', '.', true);
	});

	it('./ -> ./', () => {
		run('./', './');
	});

	it('./ -> ./ :: force', () => {
		run('./', './', true);
	});

	it('#inner -> #inner', () => {
		run('#inner', '#inner');
	});

	it('#inner -> ./#inner :: force', () => {
		run('#inner', '#inner', true);
	});

	it('./foo -> ./foo', () => {
		run('./foo', './foo');
	});

	it('./foo -> ./foo :: force', () => {
		run('./foo', './foo', true);
	});

	// partial `name` match
	// should be like EXTERNAL
	it('foo -> foo', () => {
		run('foo', 'foo');
	});

	it('foo -> ./foo :: force', () => {
		run('foo', './foo', true);
	});

	// treats as external
	it('.ini -> ./.ini', () => {
		run('.ini', '.ini');
	});

	it('.ini -> ./.ini :: force', () => {
		run('.ini', './.ini', true);
	});

	it('foo -> ./foo :: force', () => {
		run('foo', './foo', true);
	});

	// handle "import 'lib/lib';" case
	it('./PKG -> ./PKG', () => {
		let input = './' + PKG;
		run(input, input);
	});

	it('./PKG -> ./PKG :: force', () => {
		let input = './' + PKG;
		run(input, input, true);
	});

	it('PKG/subpath -> ./subpath', () => {
		let input = PKG + '/other';
		run(input, './other');
	});

	it('PKG/subpath -> ./subpath :: force', () => {
		let input = PKG + '/other';
		run(input, './other', true);
	});

	it('PKG/#inner -> #inner', () => {
		let input = PKG + '/#inner';
		run(input, '#inner');
	});

	it('PKG/#inner -> ./#inner :: force', () => {
		let input = PKG + '/#inner';
		run(input, '#inner', true);
	});

	it('PKG/.ini -> ./.ini', () => {
		let input = PKG + '/.ini';
		run(input, './.ini');
	});

	it('PKG/.ini -> ./.ini :: force', () => {
		let input = PKG + '/.ini';
		run(input, './.ini', true);
	});

	it('EXTERNAL -> EXTERNAL', () => {
		run(EXTERNAL, EXTERNAL);
	});

	it('EXTERNAL -> ./EXTERNAL :: force', () => {
		run(EXTERNAL, './'+EXTERNAL, true);
	});
});
