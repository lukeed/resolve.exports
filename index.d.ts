export interface Options {
	browser?: boolean;
	conditions?: string[];
	requires?: boolean;
}

export function resolve<T=any>(pkg: T, entry: string, options?: Options): string | void;

export function legacy<T=any>(pkg: T, options?: {
	browser?: boolean;
	fields?: string[];
}): string | void;
