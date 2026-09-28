export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export declare function reportOutput<T extends JsonValue>(value: T): T;
export declare function wrapTool<A extends JsonValue, R extends JsonValue>(name: string, implementation: (args: A) => R | Promise<R>): (args: A) => Promise<R>;
