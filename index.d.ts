export type Options = {
	browser?: boolean;
	conditions?: readonly string[];
	require?: boolean;
	unsafe?: boolean;
}

export function resolve<T=any>(pkg: T, entry: string, options?: Options): string | void;

export function legacy<T=any>(pkg: T, options: { browser: true, fields?: readonly string[] }): Browser | void;
export function legacy<T=any>(pkg: T, options: { browser: string, fields?: readonly string[] }): string | false | void;
export function legacy<T=any>(pkg: T, options: { browser: false, fields?: readonly string[] }): string | void;
export function legacy<T=any>(pkg: T, options?: {
	browser?: boolean | string;
	fields?: readonly string[];
}): Browser | string;

// ---

/**
 * A resolve condition
 * @example "node", "default", "production"
 */
export type Condition = string;

/** An internal file path */
export type Path = `./${string}`;

export type Imports = {
	[entry: Imports.Entry]: Imports.Value;
}

export namespace Imports {
	export type Entry = `#${string}`;

	type External = string;

	/** string ~> dependency OR internal path */
	export type Value = External | Path | null | {
		[c: Condition]: Value;
	} | Value[];


	export type Output = Array<External|Path> | External | Path;
}

export type Exports = Path | {
	[path: Exports.Entry]: Exports.Value;
	[cond: Condition]: Exports.Value;
}

export namespace Exports {
	/** Allows "." and "./{name}" */
	export type Entry = `.${string}`;

	/** string ~> internal path */
	export type Value = Path | null | {
		[c: Condition]: Value;
	} | Value[];

	export type Output = Path[] | Path;
}

export type Package = {
	name: string;
	version?: string;
	module?: string;
	main?: string;
	imports?: Imports;
	exports?: Exports;
	browser?: Browser;
	[key: string]: any;
}

export type Browser = string[] | string | {
	[file: Path | string]: string | false;
}
