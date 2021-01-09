export interface Options {
	requires?: boolean;
	browser?: boolean;
	fields?: string[];
}

// TODO: arrayable
export function resolve<T=any>(pkg: T, entry: string, options?: Options): string;

// TODO
// export function legacy<T=any>(pkg: T, options?: Omit<Options, 'requires'>): string;
