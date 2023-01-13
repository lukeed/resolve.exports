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
	function run(input: string, expect: string) {
		let output = $.toEntry(PKG, input);
		assert.type(output, 'string');
		assert.is(output, expect);
	}

	it('should be a function', () => {
		assert.type($.toEntry, 'function');
	});

	it('should return "." if given package name', () => {
		run(PKG, '.');
	});

	it('should return "#ident" if given "#ident" input', () => {
		run('#hello', '#hello');
	});

	it('should echo if given package subpath', () => {
		run('.', '.');
		run('./', './');
		run('./foo', './foo');
	});

	// handle "import 'lib/lib';" case
	it('should echo if given "./<PKG>" input', () => {
		let input = './' + PKG;
		run(input, input);
	});

	it('should return "./<subpath>" for "<PKG>/<subpath>" input', () => {
		let input = PKG + '/other';
		run(input, './other');
	});

	it('should return "#<ident>" for "<PKG>/#<ident>" input', () => {
		let input = PKG + '/#inner';
		run(input, '#inner');
	});
});
