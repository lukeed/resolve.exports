import * as $ from './utils';
import type * as t from 'resolve.exports';

type LegacyOptions = {
	fields?: string[];
	browser?: string | boolean;
}

type BrowserObject = {
	[file: string]: string | undefined;
}

export function legacy(pkg: t.Package, options: LegacyOptions = {}): t.Path | t.Browser | void {
	let i=0,
		value: string | t.Browser | undefined,
		browser = options.browser,
		fields = options.fields || ['module', 'main'],
		isSTRING = typeof browser == 'string';

	if (browser && !fields.includes('browser')) {
		fields.unshift('browser');
		// "module-a" -> "module-a"
		// "./path/file.js" -> "./path/file.js"
		// "foobar/path/file.js" -> "./path/file.js"
		if (isSTRING) browser = $.toEntry(pkg.name, browser as string, true);
	}

	for (; i < fields.length; i++) {
		if (value = pkg[fields[i]]) {
			if (typeof value == 'string') {
				//
			} else if (typeof value == 'object' && fields[i] == 'browser') {
				if (isSTRING) {
					value = (value as BrowserObject)[browser as string];
					if (value == null) return browser as string;
				}
			} else {
				continue;
			}

			return typeof value == 'string'
				? ('./' + value.replace(/^\.?\//, '')) as t.Path
				: value;
		}
	}
}
