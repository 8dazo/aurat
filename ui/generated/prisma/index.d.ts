
/**
 * Client
**/

import * as runtime from './runtime/client.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model MasterProfile
 * 
 */
export type MasterProfile = $Result.DefaultSelection<Prisma.$MasterProfilePayload>
/**
 * Model ApplicationHistory
 * 
 */
export type ApplicationHistory = $Result.DefaultSelection<Prisma.$ApplicationHistoryPayload>
/**
 * Model CustomQnaMemory
 * 
 */
export type CustomQnaMemory = $Result.DefaultSelection<Prisma.$CustomQnaMemoryPayload>

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient({
 *   adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
 * })
 * // Fetch zero or more MasterProfiles
 * const masterProfiles = await prisma.masterProfile.findMany()
 * ```
 *
 *
 * Read more in our [docs](https://pris.ly/d/client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  const U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   *
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient({
   *   adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
   * })
   * // Fetch zero or more MasterProfiles
   * const masterProfiles = await prisma.masterProfile.findMany()
   * ```
   *
   *
   * Read more in our [docs](https://pris.ly/d/client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): PrismaClient;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/orm/prisma-client/queries/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>

  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb<ClientOptions>, ExtArgs, $Utils.Call<Prisma.TypeMapCb<ClientOptions>, {
    extArgs: ExtArgs
  }>>

      /**
   * `prisma.masterProfile`: Exposes CRUD operations for the **MasterProfile** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more MasterProfiles
    * const masterProfiles = await prisma.masterProfile.findMany()
    * ```
    */
  get masterProfile(): Prisma.MasterProfileDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.applicationHistory`: Exposes CRUD operations for the **ApplicationHistory** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more ApplicationHistories
    * const applicationHistories = await prisma.applicationHistory.findMany()
    * ```
    */
  get applicationHistory(): Prisma.ApplicationHistoryDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.customQnaMemory`: Exposes CRUD operations for the **CustomQnaMemory** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more CustomQnaMemories
    * const customQnaMemories = await prisma.customQnaMemory.findMany()
    * ```
    */
  get customQnaMemory(): Prisma.CustomQnaMemoryDelegate<ExtArgs, ClientOptions>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 7.8.0
   * Query Engine version: 3c6e192761c0362d496ed980de936e2f3cebcd3a
   */
  export type PrismaVersion = {
    client: string
    engine: string
  }

  export const prismaVersion: PrismaVersion

  /**
   * Utility Types
   */


  export import Bytes = runtime.Bytes
  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? P : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    MasterProfile: 'MasterProfile',
    ApplicationHistory: 'ApplicationHistory',
    CustomQnaMemory: 'CustomQnaMemory'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]



  interface TypeMapCb<ClientOptions = {}> extends $Utils.Fn<{extArgs: $Extensions.InternalArgs }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], ClientOptions extends { omit: infer OmitOptions } ? OmitOptions : {}>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> = {
    globalOmitOptions: {
      omit: GlobalOmitOptions
    }
    meta: {
      modelProps: "masterProfile" | "applicationHistory" | "customQnaMemory"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      MasterProfile: {
        payload: Prisma.$MasterProfilePayload<ExtArgs>
        fields: Prisma.MasterProfileFieldRefs
        operations: {
          findUnique: {
            args: Prisma.MasterProfileFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MasterProfilePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.MasterProfileFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MasterProfilePayload>
          }
          findFirst: {
            args: Prisma.MasterProfileFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MasterProfilePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.MasterProfileFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MasterProfilePayload>
          }
          findMany: {
            args: Prisma.MasterProfileFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MasterProfilePayload>[]
          }
          create: {
            args: Prisma.MasterProfileCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MasterProfilePayload>
          }
          createMany: {
            args: Prisma.MasterProfileCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.MasterProfileCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MasterProfilePayload>[]
          }
          delete: {
            args: Prisma.MasterProfileDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MasterProfilePayload>
          }
          update: {
            args: Prisma.MasterProfileUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MasterProfilePayload>
          }
          deleteMany: {
            args: Prisma.MasterProfileDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.MasterProfileUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.MasterProfileUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MasterProfilePayload>[]
          }
          upsert: {
            args: Prisma.MasterProfileUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MasterProfilePayload>
          }
          aggregate: {
            args: Prisma.MasterProfileAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateMasterProfile>
          }
          groupBy: {
            args: Prisma.MasterProfileGroupByArgs<ExtArgs>
            result: $Utils.Optional<MasterProfileGroupByOutputType>[]
          }
          count: {
            args: Prisma.MasterProfileCountArgs<ExtArgs>
            result: $Utils.Optional<MasterProfileCountAggregateOutputType> | number
          }
        }
      }
      ApplicationHistory: {
        payload: Prisma.$ApplicationHistoryPayload<ExtArgs>
        fields: Prisma.ApplicationHistoryFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ApplicationHistoryFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApplicationHistoryPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ApplicationHistoryFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApplicationHistoryPayload>
          }
          findFirst: {
            args: Prisma.ApplicationHistoryFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApplicationHistoryPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ApplicationHistoryFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApplicationHistoryPayload>
          }
          findMany: {
            args: Prisma.ApplicationHistoryFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApplicationHistoryPayload>[]
          }
          create: {
            args: Prisma.ApplicationHistoryCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApplicationHistoryPayload>
          }
          createMany: {
            args: Prisma.ApplicationHistoryCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ApplicationHistoryCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApplicationHistoryPayload>[]
          }
          delete: {
            args: Prisma.ApplicationHistoryDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApplicationHistoryPayload>
          }
          update: {
            args: Prisma.ApplicationHistoryUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApplicationHistoryPayload>
          }
          deleteMany: {
            args: Prisma.ApplicationHistoryDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ApplicationHistoryUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.ApplicationHistoryUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApplicationHistoryPayload>[]
          }
          upsert: {
            args: Prisma.ApplicationHistoryUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApplicationHistoryPayload>
          }
          aggregate: {
            args: Prisma.ApplicationHistoryAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateApplicationHistory>
          }
          groupBy: {
            args: Prisma.ApplicationHistoryGroupByArgs<ExtArgs>
            result: $Utils.Optional<ApplicationHistoryGroupByOutputType>[]
          }
          count: {
            args: Prisma.ApplicationHistoryCountArgs<ExtArgs>
            result: $Utils.Optional<ApplicationHistoryCountAggregateOutputType> | number
          }
        }
      }
      CustomQnaMemory: {
        payload: Prisma.$CustomQnaMemoryPayload<ExtArgs>
        fields: Prisma.CustomQnaMemoryFieldRefs
        operations: {
          findUnique: {
            args: Prisma.CustomQnaMemoryFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CustomQnaMemoryPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.CustomQnaMemoryFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CustomQnaMemoryPayload>
          }
          findFirst: {
            args: Prisma.CustomQnaMemoryFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CustomQnaMemoryPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.CustomQnaMemoryFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CustomQnaMemoryPayload>
          }
          findMany: {
            args: Prisma.CustomQnaMemoryFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CustomQnaMemoryPayload>[]
          }
          create: {
            args: Prisma.CustomQnaMemoryCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CustomQnaMemoryPayload>
          }
          createMany: {
            args: Prisma.CustomQnaMemoryCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.CustomQnaMemoryCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CustomQnaMemoryPayload>[]
          }
          delete: {
            args: Prisma.CustomQnaMemoryDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CustomQnaMemoryPayload>
          }
          update: {
            args: Prisma.CustomQnaMemoryUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CustomQnaMemoryPayload>
          }
          deleteMany: {
            args: Prisma.CustomQnaMemoryDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.CustomQnaMemoryUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.CustomQnaMemoryUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CustomQnaMemoryPayload>[]
          }
          upsert: {
            args: Prisma.CustomQnaMemoryUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CustomQnaMemoryPayload>
          }
          aggregate: {
            args: Prisma.CustomQnaMemoryAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateCustomQnaMemory>
          }
          groupBy: {
            args: Prisma.CustomQnaMemoryGroupByArgs<ExtArgs>
            result: $Utils.Optional<CustomQnaMemoryGroupByOutputType>[]
          }
          count: {
            args: Prisma.CustomQnaMemoryCountArgs<ExtArgs>
            result: $Utils.Optional<CustomQnaMemoryCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Shorthand for `emit: 'stdout'`
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events only
     * log: [
     *   { emit: 'event', level: 'query' },
     *   { emit: 'event', level: 'info' },
     *   { emit: 'event', level: 'warn' }
     *   { emit: 'event', level: 'error' }
     * ]
     * 
     * / Emit as events and log to stdout
     * og: [
     *  { emit: 'stdout', level: 'query' },
     *  { emit: 'stdout', level: 'info' },
     *  { emit: 'stdout', level: 'warn' }
     *  { emit: 'stdout', level: 'error' }
     * 
     * ```
     * Read more in our [docs](https://pris.ly/d/logging).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
    /**
     * Instance of a Driver Adapter, e.g., like one provided by `@prisma/adapter-planetscale`
     */
    adapter?: runtime.SqlDriverAdapterFactory
    /**
     * Prisma Accelerate URL allowing the client to connect through Accelerate instead of a direct database.
     */
    accelerateUrl?: string
    /**
     * Global configuration for omitting model fields by default.
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   omit: {
     *     user: {
     *       password: true
     *     }
     *   }
     * })
     * ```
     */
    omit?: Prisma.GlobalOmitConfig
    /**
     * SQL commenter plugins that add metadata to SQL queries as comments.
     * Comments follow the sqlcommenter format: https://google.github.io/sqlcommenter/
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   adapter,
     *   comments: [
     *     traceContext(),
     *     queryInsights(),
     *   ],
     * })
     * ```
     */
    comments?: runtime.SqlCommenterPlugin[]
  }
  export type GlobalOmitConfig = {
    masterProfile?: MasterProfileOmit
    applicationHistory?: ApplicationHistoryOmit
    customQnaMemory?: CustomQnaMemoryOmit
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type CheckIsLogLevel<T> = T extends LogLevel ? T : never;

  export type GetLogType<T> = CheckIsLogLevel<
    T extends LogDefinition ? T['level'] : T
  >;

  export type GetEvents<T extends any[]> = T extends Array<LogLevel | LogDefinition>
    ? GetLogType<T[number]>
    : never;

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'updateManyAndReturn'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type ApplicationHistoryCountOutputType
   */

  export type ApplicationHistoryCountOutputType = {
    qnaMemories: number
  }

  export type ApplicationHistoryCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    qnaMemories?: boolean | ApplicationHistoryCountOutputTypeCountQnaMemoriesArgs
  }

  // Custom InputTypes
  /**
   * ApplicationHistoryCountOutputType without action
   */
  export type ApplicationHistoryCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ApplicationHistoryCountOutputType
     */
    select?: ApplicationHistoryCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * ApplicationHistoryCountOutputType without action
   */
  export type ApplicationHistoryCountOutputTypeCountQnaMemoriesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: CustomQnaMemoryWhereInput
  }


  /**
   * Models
   */

  /**
   * Model MasterProfile
   */

  export type AggregateMasterProfile = {
    _count: MasterProfileCountAggregateOutputType | null
    _avg: MasterProfileAvgAggregateOutputType | null
    _sum: MasterProfileSumAggregateOutputType | null
    _min: MasterProfileMinAggregateOutputType | null
    _max: MasterProfileMaxAggregateOutputType | null
  }

  export type MasterProfileAvgAggregateOutputType = {
    id: number | null
  }

  export type MasterProfileSumAggregateOutputType = {
    id: number | null
  }

  export type MasterProfileMinAggregateOutputType = {
    id: number | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type MasterProfileMaxAggregateOutputType = {
    id: number | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type MasterProfileCountAggregateOutputType = {
    id: number
    data: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type MasterProfileAvgAggregateInputType = {
    id?: true
  }

  export type MasterProfileSumAggregateInputType = {
    id?: true
  }

  export type MasterProfileMinAggregateInputType = {
    id?: true
    createdAt?: true
    updatedAt?: true
  }

  export type MasterProfileMaxAggregateInputType = {
    id?: true
    createdAt?: true
    updatedAt?: true
  }

  export type MasterProfileCountAggregateInputType = {
    id?: true
    data?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type MasterProfileAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which MasterProfile to aggregate.
     */
    where?: MasterProfileWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of MasterProfiles to fetch.
     */
    orderBy?: MasterProfileOrderByWithRelationInput | MasterProfileOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: MasterProfileWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` MasterProfiles from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` MasterProfiles.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned MasterProfiles
    **/
    _count?: true | MasterProfileCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: MasterProfileAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: MasterProfileSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: MasterProfileMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: MasterProfileMaxAggregateInputType
  }

  export type GetMasterProfileAggregateType<T extends MasterProfileAggregateArgs> = {
        [P in keyof T & keyof AggregateMasterProfile]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateMasterProfile[P]>
      : GetScalarType<T[P], AggregateMasterProfile[P]>
  }




  export type MasterProfileGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: MasterProfileWhereInput
    orderBy?: MasterProfileOrderByWithAggregationInput | MasterProfileOrderByWithAggregationInput[]
    by: MasterProfileScalarFieldEnum[] | MasterProfileScalarFieldEnum
    having?: MasterProfileScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: MasterProfileCountAggregateInputType | true
    _avg?: MasterProfileAvgAggregateInputType
    _sum?: MasterProfileSumAggregateInputType
    _min?: MasterProfileMinAggregateInputType
    _max?: MasterProfileMaxAggregateInputType
  }

  export type MasterProfileGroupByOutputType = {
    id: number
    data: JsonValue
    createdAt: Date
    updatedAt: Date
    _count: MasterProfileCountAggregateOutputType | null
    _avg: MasterProfileAvgAggregateOutputType | null
    _sum: MasterProfileSumAggregateOutputType | null
    _min: MasterProfileMinAggregateOutputType | null
    _max: MasterProfileMaxAggregateOutputType | null
  }

  type GetMasterProfileGroupByPayload<T extends MasterProfileGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<MasterProfileGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof MasterProfileGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], MasterProfileGroupByOutputType[P]>
            : GetScalarType<T[P], MasterProfileGroupByOutputType[P]>
        }
      >
    >


  export type MasterProfileSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    data?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["masterProfile"]>

  export type MasterProfileSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    data?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["masterProfile"]>

  export type MasterProfileSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    data?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["masterProfile"]>

  export type MasterProfileSelectScalar = {
    id?: boolean
    data?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type MasterProfileOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "data" | "createdAt" | "updatedAt", ExtArgs["result"]["masterProfile"]>

  export type $MasterProfilePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "MasterProfile"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: number
      data: Prisma.JsonValue
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["masterProfile"]>
    composites: {}
  }

  type MasterProfileGetPayload<S extends boolean | null | undefined | MasterProfileDefaultArgs> = $Result.GetResult<Prisma.$MasterProfilePayload, S>

  type MasterProfileCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<MasterProfileFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: MasterProfileCountAggregateInputType | true
    }

  export interface MasterProfileDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['MasterProfile'], meta: { name: 'MasterProfile' } }
    /**
     * Find zero or one MasterProfile that matches the filter.
     * @param {MasterProfileFindUniqueArgs} args - Arguments to find a MasterProfile
     * @example
     * // Get one MasterProfile
     * const masterProfile = await prisma.masterProfile.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends MasterProfileFindUniqueArgs>(args: SelectSubset<T, MasterProfileFindUniqueArgs<ExtArgs>>): Prisma__MasterProfileClient<$Result.GetResult<Prisma.$MasterProfilePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one MasterProfile that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {MasterProfileFindUniqueOrThrowArgs} args - Arguments to find a MasterProfile
     * @example
     * // Get one MasterProfile
     * const masterProfile = await prisma.masterProfile.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends MasterProfileFindUniqueOrThrowArgs>(args: SelectSubset<T, MasterProfileFindUniqueOrThrowArgs<ExtArgs>>): Prisma__MasterProfileClient<$Result.GetResult<Prisma.$MasterProfilePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first MasterProfile that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MasterProfileFindFirstArgs} args - Arguments to find a MasterProfile
     * @example
     * // Get one MasterProfile
     * const masterProfile = await prisma.masterProfile.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends MasterProfileFindFirstArgs>(args?: SelectSubset<T, MasterProfileFindFirstArgs<ExtArgs>>): Prisma__MasterProfileClient<$Result.GetResult<Prisma.$MasterProfilePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first MasterProfile that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MasterProfileFindFirstOrThrowArgs} args - Arguments to find a MasterProfile
     * @example
     * // Get one MasterProfile
     * const masterProfile = await prisma.masterProfile.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends MasterProfileFindFirstOrThrowArgs>(args?: SelectSubset<T, MasterProfileFindFirstOrThrowArgs<ExtArgs>>): Prisma__MasterProfileClient<$Result.GetResult<Prisma.$MasterProfilePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more MasterProfiles that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MasterProfileFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all MasterProfiles
     * const masterProfiles = await prisma.masterProfile.findMany()
     * 
     * // Get first 10 MasterProfiles
     * const masterProfiles = await prisma.masterProfile.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const masterProfileWithIdOnly = await prisma.masterProfile.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends MasterProfileFindManyArgs>(args?: SelectSubset<T, MasterProfileFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$MasterProfilePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a MasterProfile.
     * @param {MasterProfileCreateArgs} args - Arguments to create a MasterProfile.
     * @example
     * // Create one MasterProfile
     * const MasterProfile = await prisma.masterProfile.create({
     *   data: {
     *     // ... data to create a MasterProfile
     *   }
     * })
     * 
     */
    create<T extends MasterProfileCreateArgs>(args: SelectSubset<T, MasterProfileCreateArgs<ExtArgs>>): Prisma__MasterProfileClient<$Result.GetResult<Prisma.$MasterProfilePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many MasterProfiles.
     * @param {MasterProfileCreateManyArgs} args - Arguments to create many MasterProfiles.
     * @example
     * // Create many MasterProfiles
     * const masterProfile = await prisma.masterProfile.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends MasterProfileCreateManyArgs>(args?: SelectSubset<T, MasterProfileCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many MasterProfiles and returns the data saved in the database.
     * @param {MasterProfileCreateManyAndReturnArgs} args - Arguments to create many MasterProfiles.
     * @example
     * // Create many MasterProfiles
     * const masterProfile = await prisma.masterProfile.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many MasterProfiles and only return the `id`
     * const masterProfileWithIdOnly = await prisma.masterProfile.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends MasterProfileCreateManyAndReturnArgs>(args?: SelectSubset<T, MasterProfileCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$MasterProfilePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a MasterProfile.
     * @param {MasterProfileDeleteArgs} args - Arguments to delete one MasterProfile.
     * @example
     * // Delete one MasterProfile
     * const MasterProfile = await prisma.masterProfile.delete({
     *   where: {
     *     // ... filter to delete one MasterProfile
     *   }
     * })
     * 
     */
    delete<T extends MasterProfileDeleteArgs>(args: SelectSubset<T, MasterProfileDeleteArgs<ExtArgs>>): Prisma__MasterProfileClient<$Result.GetResult<Prisma.$MasterProfilePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one MasterProfile.
     * @param {MasterProfileUpdateArgs} args - Arguments to update one MasterProfile.
     * @example
     * // Update one MasterProfile
     * const masterProfile = await prisma.masterProfile.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends MasterProfileUpdateArgs>(args: SelectSubset<T, MasterProfileUpdateArgs<ExtArgs>>): Prisma__MasterProfileClient<$Result.GetResult<Prisma.$MasterProfilePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more MasterProfiles.
     * @param {MasterProfileDeleteManyArgs} args - Arguments to filter MasterProfiles to delete.
     * @example
     * // Delete a few MasterProfiles
     * const { count } = await prisma.masterProfile.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends MasterProfileDeleteManyArgs>(args?: SelectSubset<T, MasterProfileDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more MasterProfiles.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MasterProfileUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many MasterProfiles
     * const masterProfile = await prisma.masterProfile.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends MasterProfileUpdateManyArgs>(args: SelectSubset<T, MasterProfileUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more MasterProfiles and returns the data updated in the database.
     * @param {MasterProfileUpdateManyAndReturnArgs} args - Arguments to update many MasterProfiles.
     * @example
     * // Update many MasterProfiles
     * const masterProfile = await prisma.masterProfile.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more MasterProfiles and only return the `id`
     * const masterProfileWithIdOnly = await prisma.masterProfile.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends MasterProfileUpdateManyAndReturnArgs>(args: SelectSubset<T, MasterProfileUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$MasterProfilePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one MasterProfile.
     * @param {MasterProfileUpsertArgs} args - Arguments to update or create a MasterProfile.
     * @example
     * // Update or create a MasterProfile
     * const masterProfile = await prisma.masterProfile.upsert({
     *   create: {
     *     // ... data to create a MasterProfile
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the MasterProfile we want to update
     *   }
     * })
     */
    upsert<T extends MasterProfileUpsertArgs>(args: SelectSubset<T, MasterProfileUpsertArgs<ExtArgs>>): Prisma__MasterProfileClient<$Result.GetResult<Prisma.$MasterProfilePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of MasterProfiles.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MasterProfileCountArgs} args - Arguments to filter MasterProfiles to count.
     * @example
     * // Count the number of MasterProfiles
     * const count = await prisma.masterProfile.count({
     *   where: {
     *     // ... the filter for the MasterProfiles we want to count
     *   }
     * })
    **/
    count<T extends MasterProfileCountArgs>(
      args?: Subset<T, MasterProfileCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], MasterProfileCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a MasterProfile.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MasterProfileAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends MasterProfileAggregateArgs>(args: Subset<T, MasterProfileAggregateArgs>): Prisma.PrismaPromise<GetMasterProfileAggregateType<T>>

    /**
     * Group by MasterProfile.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MasterProfileGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends MasterProfileGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: MasterProfileGroupByArgs['orderBy'] }
        : { orderBy?: MasterProfileGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, MasterProfileGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetMasterProfileGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the MasterProfile model
   */
  readonly fields: MasterProfileFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for MasterProfile.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__MasterProfileClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the MasterProfile model
   */
  interface MasterProfileFieldRefs {
    readonly id: FieldRef<"MasterProfile", 'Int'>
    readonly data: FieldRef<"MasterProfile", 'Json'>
    readonly createdAt: FieldRef<"MasterProfile", 'DateTime'>
    readonly updatedAt: FieldRef<"MasterProfile", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * MasterProfile findUnique
   */
  export type MasterProfileFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MasterProfile
     */
    select?: MasterProfileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MasterProfile
     */
    omit?: MasterProfileOmit<ExtArgs> | null
    /**
     * Filter, which MasterProfile to fetch.
     */
    where: MasterProfileWhereUniqueInput
  }

  /**
   * MasterProfile findUniqueOrThrow
   */
  export type MasterProfileFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MasterProfile
     */
    select?: MasterProfileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MasterProfile
     */
    omit?: MasterProfileOmit<ExtArgs> | null
    /**
     * Filter, which MasterProfile to fetch.
     */
    where: MasterProfileWhereUniqueInput
  }

  /**
   * MasterProfile findFirst
   */
  export type MasterProfileFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MasterProfile
     */
    select?: MasterProfileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MasterProfile
     */
    omit?: MasterProfileOmit<ExtArgs> | null
    /**
     * Filter, which MasterProfile to fetch.
     */
    where?: MasterProfileWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of MasterProfiles to fetch.
     */
    orderBy?: MasterProfileOrderByWithRelationInput | MasterProfileOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for MasterProfiles.
     */
    cursor?: MasterProfileWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` MasterProfiles from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` MasterProfiles.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of MasterProfiles.
     */
    distinct?: MasterProfileScalarFieldEnum | MasterProfileScalarFieldEnum[]
  }

  /**
   * MasterProfile findFirstOrThrow
   */
  export type MasterProfileFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MasterProfile
     */
    select?: MasterProfileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MasterProfile
     */
    omit?: MasterProfileOmit<ExtArgs> | null
    /**
     * Filter, which MasterProfile to fetch.
     */
    where?: MasterProfileWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of MasterProfiles to fetch.
     */
    orderBy?: MasterProfileOrderByWithRelationInput | MasterProfileOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for MasterProfiles.
     */
    cursor?: MasterProfileWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` MasterProfiles from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` MasterProfiles.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of MasterProfiles.
     */
    distinct?: MasterProfileScalarFieldEnum | MasterProfileScalarFieldEnum[]
  }

  /**
   * MasterProfile findMany
   */
  export type MasterProfileFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MasterProfile
     */
    select?: MasterProfileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MasterProfile
     */
    omit?: MasterProfileOmit<ExtArgs> | null
    /**
     * Filter, which MasterProfiles to fetch.
     */
    where?: MasterProfileWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of MasterProfiles to fetch.
     */
    orderBy?: MasterProfileOrderByWithRelationInput | MasterProfileOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing MasterProfiles.
     */
    cursor?: MasterProfileWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` MasterProfiles from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` MasterProfiles.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of MasterProfiles.
     */
    distinct?: MasterProfileScalarFieldEnum | MasterProfileScalarFieldEnum[]
  }

  /**
   * MasterProfile create
   */
  export type MasterProfileCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MasterProfile
     */
    select?: MasterProfileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MasterProfile
     */
    omit?: MasterProfileOmit<ExtArgs> | null
    /**
     * The data needed to create a MasterProfile.
     */
    data: XOR<MasterProfileCreateInput, MasterProfileUncheckedCreateInput>
  }

  /**
   * MasterProfile createMany
   */
  export type MasterProfileCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many MasterProfiles.
     */
    data: MasterProfileCreateManyInput | MasterProfileCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * MasterProfile createManyAndReturn
   */
  export type MasterProfileCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MasterProfile
     */
    select?: MasterProfileSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the MasterProfile
     */
    omit?: MasterProfileOmit<ExtArgs> | null
    /**
     * The data used to create many MasterProfiles.
     */
    data: MasterProfileCreateManyInput | MasterProfileCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * MasterProfile update
   */
  export type MasterProfileUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MasterProfile
     */
    select?: MasterProfileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MasterProfile
     */
    omit?: MasterProfileOmit<ExtArgs> | null
    /**
     * The data needed to update a MasterProfile.
     */
    data: XOR<MasterProfileUpdateInput, MasterProfileUncheckedUpdateInput>
    /**
     * Choose, which MasterProfile to update.
     */
    where: MasterProfileWhereUniqueInput
  }

  /**
   * MasterProfile updateMany
   */
  export type MasterProfileUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update MasterProfiles.
     */
    data: XOR<MasterProfileUpdateManyMutationInput, MasterProfileUncheckedUpdateManyInput>
    /**
     * Filter which MasterProfiles to update
     */
    where?: MasterProfileWhereInput
    /**
     * Limit how many MasterProfiles to update.
     */
    limit?: number
  }

  /**
   * MasterProfile updateManyAndReturn
   */
  export type MasterProfileUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MasterProfile
     */
    select?: MasterProfileSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the MasterProfile
     */
    omit?: MasterProfileOmit<ExtArgs> | null
    /**
     * The data used to update MasterProfiles.
     */
    data: XOR<MasterProfileUpdateManyMutationInput, MasterProfileUncheckedUpdateManyInput>
    /**
     * Filter which MasterProfiles to update
     */
    where?: MasterProfileWhereInput
    /**
     * Limit how many MasterProfiles to update.
     */
    limit?: number
  }

  /**
   * MasterProfile upsert
   */
  export type MasterProfileUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MasterProfile
     */
    select?: MasterProfileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MasterProfile
     */
    omit?: MasterProfileOmit<ExtArgs> | null
    /**
     * The filter to search for the MasterProfile to update in case it exists.
     */
    where: MasterProfileWhereUniqueInput
    /**
     * In case the MasterProfile found by the `where` argument doesn't exist, create a new MasterProfile with this data.
     */
    create: XOR<MasterProfileCreateInput, MasterProfileUncheckedCreateInput>
    /**
     * In case the MasterProfile was found with the provided `where` argument, update it with this data.
     */
    update: XOR<MasterProfileUpdateInput, MasterProfileUncheckedUpdateInput>
  }

  /**
   * MasterProfile delete
   */
  export type MasterProfileDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MasterProfile
     */
    select?: MasterProfileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MasterProfile
     */
    omit?: MasterProfileOmit<ExtArgs> | null
    /**
     * Filter which MasterProfile to delete.
     */
    where: MasterProfileWhereUniqueInput
  }

  /**
   * MasterProfile deleteMany
   */
  export type MasterProfileDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which MasterProfiles to delete
     */
    where?: MasterProfileWhereInput
    /**
     * Limit how many MasterProfiles to delete.
     */
    limit?: number
  }

  /**
   * MasterProfile without action
   */
  export type MasterProfileDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MasterProfile
     */
    select?: MasterProfileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MasterProfile
     */
    omit?: MasterProfileOmit<ExtArgs> | null
  }


  /**
   * Model ApplicationHistory
   */

  export type AggregateApplicationHistory = {
    _count: ApplicationHistoryCountAggregateOutputType | null
    _avg: ApplicationHistoryAvgAggregateOutputType | null
    _sum: ApplicationHistorySumAggregateOutputType | null
    _min: ApplicationHistoryMinAggregateOutputType | null
    _max: ApplicationHistoryMaxAggregateOutputType | null
  }

  export type ApplicationHistoryAvgAggregateOutputType = {
    id: number | null
    matchScore: number | null
  }

  export type ApplicationHistorySumAggregateOutputType = {
    id: number | null
    matchScore: number | null
  }

  export type ApplicationHistoryMinAggregateOutputType = {
    id: number | null
    jobUrl: string | null
    atsPlatform: string | null
    jobTitle: string | null
    company: string | null
    matchScore: number | null
    status: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type ApplicationHistoryMaxAggregateOutputType = {
    id: number | null
    jobUrl: string | null
    atsPlatform: string | null
    jobTitle: string | null
    company: string | null
    matchScore: number | null
    status: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type ApplicationHistoryCountAggregateOutputType = {
    id: number
    jobUrl: number
    atsPlatform: number
    jobTitle: number
    company: number
    matchScore: number
    status: number
    stepsLog: number
    customQuestions: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type ApplicationHistoryAvgAggregateInputType = {
    id?: true
    matchScore?: true
  }

  export type ApplicationHistorySumAggregateInputType = {
    id?: true
    matchScore?: true
  }

  export type ApplicationHistoryMinAggregateInputType = {
    id?: true
    jobUrl?: true
    atsPlatform?: true
    jobTitle?: true
    company?: true
    matchScore?: true
    status?: true
    createdAt?: true
    updatedAt?: true
  }

  export type ApplicationHistoryMaxAggregateInputType = {
    id?: true
    jobUrl?: true
    atsPlatform?: true
    jobTitle?: true
    company?: true
    matchScore?: true
    status?: true
    createdAt?: true
    updatedAt?: true
  }

  export type ApplicationHistoryCountAggregateInputType = {
    id?: true
    jobUrl?: true
    atsPlatform?: true
    jobTitle?: true
    company?: true
    matchScore?: true
    status?: true
    stepsLog?: true
    customQuestions?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type ApplicationHistoryAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ApplicationHistory to aggregate.
     */
    where?: ApplicationHistoryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ApplicationHistories to fetch.
     */
    orderBy?: ApplicationHistoryOrderByWithRelationInput | ApplicationHistoryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ApplicationHistoryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ApplicationHistories from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ApplicationHistories.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned ApplicationHistories
    **/
    _count?: true | ApplicationHistoryCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ApplicationHistoryAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ApplicationHistorySumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ApplicationHistoryMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ApplicationHistoryMaxAggregateInputType
  }

  export type GetApplicationHistoryAggregateType<T extends ApplicationHistoryAggregateArgs> = {
        [P in keyof T & keyof AggregateApplicationHistory]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateApplicationHistory[P]>
      : GetScalarType<T[P], AggregateApplicationHistory[P]>
  }




  export type ApplicationHistoryGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ApplicationHistoryWhereInput
    orderBy?: ApplicationHistoryOrderByWithAggregationInput | ApplicationHistoryOrderByWithAggregationInput[]
    by: ApplicationHistoryScalarFieldEnum[] | ApplicationHistoryScalarFieldEnum
    having?: ApplicationHistoryScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ApplicationHistoryCountAggregateInputType | true
    _avg?: ApplicationHistoryAvgAggregateInputType
    _sum?: ApplicationHistorySumAggregateInputType
    _min?: ApplicationHistoryMinAggregateInputType
    _max?: ApplicationHistoryMaxAggregateInputType
  }

  export type ApplicationHistoryGroupByOutputType = {
    id: number
    jobUrl: string
    atsPlatform: string
    jobTitle: string
    company: string
    matchScore: number | null
    status: string
    stepsLog: JsonValue
    customQuestions: JsonValue
    createdAt: Date
    updatedAt: Date
    _count: ApplicationHistoryCountAggregateOutputType | null
    _avg: ApplicationHistoryAvgAggregateOutputType | null
    _sum: ApplicationHistorySumAggregateOutputType | null
    _min: ApplicationHistoryMinAggregateOutputType | null
    _max: ApplicationHistoryMaxAggregateOutputType | null
  }

  type GetApplicationHistoryGroupByPayload<T extends ApplicationHistoryGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ApplicationHistoryGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ApplicationHistoryGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ApplicationHistoryGroupByOutputType[P]>
            : GetScalarType<T[P], ApplicationHistoryGroupByOutputType[P]>
        }
      >
    >


  export type ApplicationHistorySelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    jobUrl?: boolean
    atsPlatform?: boolean
    jobTitle?: boolean
    company?: boolean
    matchScore?: boolean
    status?: boolean
    stepsLog?: boolean
    customQuestions?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    qnaMemories?: boolean | ApplicationHistory$qnaMemoriesArgs<ExtArgs>
    _count?: boolean | ApplicationHistoryCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["applicationHistory"]>

  export type ApplicationHistorySelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    jobUrl?: boolean
    atsPlatform?: boolean
    jobTitle?: boolean
    company?: boolean
    matchScore?: boolean
    status?: boolean
    stepsLog?: boolean
    customQuestions?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["applicationHistory"]>

  export type ApplicationHistorySelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    jobUrl?: boolean
    atsPlatform?: boolean
    jobTitle?: boolean
    company?: boolean
    matchScore?: boolean
    status?: boolean
    stepsLog?: boolean
    customQuestions?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["applicationHistory"]>

  export type ApplicationHistorySelectScalar = {
    id?: boolean
    jobUrl?: boolean
    atsPlatform?: boolean
    jobTitle?: boolean
    company?: boolean
    matchScore?: boolean
    status?: boolean
    stepsLog?: boolean
    customQuestions?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type ApplicationHistoryOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "jobUrl" | "atsPlatform" | "jobTitle" | "company" | "matchScore" | "status" | "stepsLog" | "customQuestions" | "createdAt" | "updatedAt", ExtArgs["result"]["applicationHistory"]>
  export type ApplicationHistoryInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    qnaMemories?: boolean | ApplicationHistory$qnaMemoriesArgs<ExtArgs>
    _count?: boolean | ApplicationHistoryCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type ApplicationHistoryIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type ApplicationHistoryIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $ApplicationHistoryPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "ApplicationHistory"
    objects: {
      qnaMemories: Prisma.$CustomQnaMemoryPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      jobUrl: string
      atsPlatform: string
      jobTitle: string
      company: string
      matchScore: number | null
      status: string
      stepsLog: Prisma.JsonValue
      customQuestions: Prisma.JsonValue
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["applicationHistory"]>
    composites: {}
  }

  type ApplicationHistoryGetPayload<S extends boolean | null | undefined | ApplicationHistoryDefaultArgs> = $Result.GetResult<Prisma.$ApplicationHistoryPayload, S>

  type ApplicationHistoryCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<ApplicationHistoryFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: ApplicationHistoryCountAggregateInputType | true
    }

  export interface ApplicationHistoryDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ApplicationHistory'], meta: { name: 'ApplicationHistory' } }
    /**
     * Find zero or one ApplicationHistory that matches the filter.
     * @param {ApplicationHistoryFindUniqueArgs} args - Arguments to find a ApplicationHistory
     * @example
     * // Get one ApplicationHistory
     * const applicationHistory = await prisma.applicationHistory.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ApplicationHistoryFindUniqueArgs>(args: SelectSubset<T, ApplicationHistoryFindUniqueArgs<ExtArgs>>): Prisma__ApplicationHistoryClient<$Result.GetResult<Prisma.$ApplicationHistoryPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one ApplicationHistory that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {ApplicationHistoryFindUniqueOrThrowArgs} args - Arguments to find a ApplicationHistory
     * @example
     * // Get one ApplicationHistory
     * const applicationHistory = await prisma.applicationHistory.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ApplicationHistoryFindUniqueOrThrowArgs>(args: SelectSubset<T, ApplicationHistoryFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ApplicationHistoryClient<$Result.GetResult<Prisma.$ApplicationHistoryPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ApplicationHistory that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ApplicationHistoryFindFirstArgs} args - Arguments to find a ApplicationHistory
     * @example
     * // Get one ApplicationHistory
     * const applicationHistory = await prisma.applicationHistory.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ApplicationHistoryFindFirstArgs>(args?: SelectSubset<T, ApplicationHistoryFindFirstArgs<ExtArgs>>): Prisma__ApplicationHistoryClient<$Result.GetResult<Prisma.$ApplicationHistoryPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ApplicationHistory that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ApplicationHistoryFindFirstOrThrowArgs} args - Arguments to find a ApplicationHistory
     * @example
     * // Get one ApplicationHistory
     * const applicationHistory = await prisma.applicationHistory.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ApplicationHistoryFindFirstOrThrowArgs>(args?: SelectSubset<T, ApplicationHistoryFindFirstOrThrowArgs<ExtArgs>>): Prisma__ApplicationHistoryClient<$Result.GetResult<Prisma.$ApplicationHistoryPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more ApplicationHistories that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ApplicationHistoryFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all ApplicationHistories
     * const applicationHistories = await prisma.applicationHistory.findMany()
     * 
     * // Get first 10 ApplicationHistories
     * const applicationHistories = await prisma.applicationHistory.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const applicationHistoryWithIdOnly = await prisma.applicationHistory.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ApplicationHistoryFindManyArgs>(args?: SelectSubset<T, ApplicationHistoryFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ApplicationHistoryPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a ApplicationHistory.
     * @param {ApplicationHistoryCreateArgs} args - Arguments to create a ApplicationHistory.
     * @example
     * // Create one ApplicationHistory
     * const ApplicationHistory = await prisma.applicationHistory.create({
     *   data: {
     *     // ... data to create a ApplicationHistory
     *   }
     * })
     * 
     */
    create<T extends ApplicationHistoryCreateArgs>(args: SelectSubset<T, ApplicationHistoryCreateArgs<ExtArgs>>): Prisma__ApplicationHistoryClient<$Result.GetResult<Prisma.$ApplicationHistoryPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many ApplicationHistories.
     * @param {ApplicationHistoryCreateManyArgs} args - Arguments to create many ApplicationHistories.
     * @example
     * // Create many ApplicationHistories
     * const applicationHistory = await prisma.applicationHistory.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ApplicationHistoryCreateManyArgs>(args?: SelectSubset<T, ApplicationHistoryCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many ApplicationHistories and returns the data saved in the database.
     * @param {ApplicationHistoryCreateManyAndReturnArgs} args - Arguments to create many ApplicationHistories.
     * @example
     * // Create many ApplicationHistories
     * const applicationHistory = await prisma.applicationHistory.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many ApplicationHistories and only return the `id`
     * const applicationHistoryWithIdOnly = await prisma.applicationHistory.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ApplicationHistoryCreateManyAndReturnArgs>(args?: SelectSubset<T, ApplicationHistoryCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ApplicationHistoryPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a ApplicationHistory.
     * @param {ApplicationHistoryDeleteArgs} args - Arguments to delete one ApplicationHistory.
     * @example
     * // Delete one ApplicationHistory
     * const ApplicationHistory = await prisma.applicationHistory.delete({
     *   where: {
     *     // ... filter to delete one ApplicationHistory
     *   }
     * })
     * 
     */
    delete<T extends ApplicationHistoryDeleteArgs>(args: SelectSubset<T, ApplicationHistoryDeleteArgs<ExtArgs>>): Prisma__ApplicationHistoryClient<$Result.GetResult<Prisma.$ApplicationHistoryPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one ApplicationHistory.
     * @param {ApplicationHistoryUpdateArgs} args - Arguments to update one ApplicationHistory.
     * @example
     * // Update one ApplicationHistory
     * const applicationHistory = await prisma.applicationHistory.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ApplicationHistoryUpdateArgs>(args: SelectSubset<T, ApplicationHistoryUpdateArgs<ExtArgs>>): Prisma__ApplicationHistoryClient<$Result.GetResult<Prisma.$ApplicationHistoryPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more ApplicationHistories.
     * @param {ApplicationHistoryDeleteManyArgs} args - Arguments to filter ApplicationHistories to delete.
     * @example
     * // Delete a few ApplicationHistories
     * const { count } = await prisma.applicationHistory.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ApplicationHistoryDeleteManyArgs>(args?: SelectSubset<T, ApplicationHistoryDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ApplicationHistories.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ApplicationHistoryUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many ApplicationHistories
     * const applicationHistory = await prisma.applicationHistory.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ApplicationHistoryUpdateManyArgs>(args: SelectSubset<T, ApplicationHistoryUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ApplicationHistories and returns the data updated in the database.
     * @param {ApplicationHistoryUpdateManyAndReturnArgs} args - Arguments to update many ApplicationHistories.
     * @example
     * // Update many ApplicationHistories
     * const applicationHistory = await prisma.applicationHistory.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more ApplicationHistories and only return the `id`
     * const applicationHistoryWithIdOnly = await prisma.applicationHistory.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends ApplicationHistoryUpdateManyAndReturnArgs>(args: SelectSubset<T, ApplicationHistoryUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ApplicationHistoryPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one ApplicationHistory.
     * @param {ApplicationHistoryUpsertArgs} args - Arguments to update or create a ApplicationHistory.
     * @example
     * // Update or create a ApplicationHistory
     * const applicationHistory = await prisma.applicationHistory.upsert({
     *   create: {
     *     // ... data to create a ApplicationHistory
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the ApplicationHistory we want to update
     *   }
     * })
     */
    upsert<T extends ApplicationHistoryUpsertArgs>(args: SelectSubset<T, ApplicationHistoryUpsertArgs<ExtArgs>>): Prisma__ApplicationHistoryClient<$Result.GetResult<Prisma.$ApplicationHistoryPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of ApplicationHistories.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ApplicationHistoryCountArgs} args - Arguments to filter ApplicationHistories to count.
     * @example
     * // Count the number of ApplicationHistories
     * const count = await prisma.applicationHistory.count({
     *   where: {
     *     // ... the filter for the ApplicationHistories we want to count
     *   }
     * })
    **/
    count<T extends ApplicationHistoryCountArgs>(
      args?: Subset<T, ApplicationHistoryCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ApplicationHistoryCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a ApplicationHistory.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ApplicationHistoryAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ApplicationHistoryAggregateArgs>(args: Subset<T, ApplicationHistoryAggregateArgs>): Prisma.PrismaPromise<GetApplicationHistoryAggregateType<T>>

    /**
     * Group by ApplicationHistory.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ApplicationHistoryGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ApplicationHistoryGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ApplicationHistoryGroupByArgs['orderBy'] }
        : { orderBy?: ApplicationHistoryGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ApplicationHistoryGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetApplicationHistoryGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the ApplicationHistory model
   */
  readonly fields: ApplicationHistoryFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for ApplicationHistory.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ApplicationHistoryClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    qnaMemories<T extends ApplicationHistory$qnaMemoriesArgs<ExtArgs> = {}>(args?: Subset<T, ApplicationHistory$qnaMemoriesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CustomQnaMemoryPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the ApplicationHistory model
   */
  interface ApplicationHistoryFieldRefs {
    readonly id: FieldRef<"ApplicationHistory", 'Int'>
    readonly jobUrl: FieldRef<"ApplicationHistory", 'String'>
    readonly atsPlatform: FieldRef<"ApplicationHistory", 'String'>
    readonly jobTitle: FieldRef<"ApplicationHistory", 'String'>
    readonly company: FieldRef<"ApplicationHistory", 'String'>
    readonly matchScore: FieldRef<"ApplicationHistory", 'Float'>
    readonly status: FieldRef<"ApplicationHistory", 'String'>
    readonly stepsLog: FieldRef<"ApplicationHistory", 'Json'>
    readonly customQuestions: FieldRef<"ApplicationHistory", 'Json'>
    readonly createdAt: FieldRef<"ApplicationHistory", 'DateTime'>
    readonly updatedAt: FieldRef<"ApplicationHistory", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * ApplicationHistory findUnique
   */
  export type ApplicationHistoryFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ApplicationHistory
     */
    select?: ApplicationHistorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the ApplicationHistory
     */
    omit?: ApplicationHistoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApplicationHistoryInclude<ExtArgs> | null
    /**
     * Filter, which ApplicationHistory to fetch.
     */
    where: ApplicationHistoryWhereUniqueInput
  }

  /**
   * ApplicationHistory findUniqueOrThrow
   */
  export type ApplicationHistoryFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ApplicationHistory
     */
    select?: ApplicationHistorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the ApplicationHistory
     */
    omit?: ApplicationHistoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApplicationHistoryInclude<ExtArgs> | null
    /**
     * Filter, which ApplicationHistory to fetch.
     */
    where: ApplicationHistoryWhereUniqueInput
  }

  /**
   * ApplicationHistory findFirst
   */
  export type ApplicationHistoryFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ApplicationHistory
     */
    select?: ApplicationHistorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the ApplicationHistory
     */
    omit?: ApplicationHistoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApplicationHistoryInclude<ExtArgs> | null
    /**
     * Filter, which ApplicationHistory to fetch.
     */
    where?: ApplicationHistoryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ApplicationHistories to fetch.
     */
    orderBy?: ApplicationHistoryOrderByWithRelationInput | ApplicationHistoryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ApplicationHistories.
     */
    cursor?: ApplicationHistoryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ApplicationHistories from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ApplicationHistories.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ApplicationHistories.
     */
    distinct?: ApplicationHistoryScalarFieldEnum | ApplicationHistoryScalarFieldEnum[]
  }

  /**
   * ApplicationHistory findFirstOrThrow
   */
  export type ApplicationHistoryFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ApplicationHistory
     */
    select?: ApplicationHistorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the ApplicationHistory
     */
    omit?: ApplicationHistoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApplicationHistoryInclude<ExtArgs> | null
    /**
     * Filter, which ApplicationHistory to fetch.
     */
    where?: ApplicationHistoryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ApplicationHistories to fetch.
     */
    orderBy?: ApplicationHistoryOrderByWithRelationInput | ApplicationHistoryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ApplicationHistories.
     */
    cursor?: ApplicationHistoryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ApplicationHistories from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ApplicationHistories.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ApplicationHistories.
     */
    distinct?: ApplicationHistoryScalarFieldEnum | ApplicationHistoryScalarFieldEnum[]
  }

  /**
   * ApplicationHistory findMany
   */
  export type ApplicationHistoryFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ApplicationHistory
     */
    select?: ApplicationHistorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the ApplicationHistory
     */
    omit?: ApplicationHistoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApplicationHistoryInclude<ExtArgs> | null
    /**
     * Filter, which ApplicationHistories to fetch.
     */
    where?: ApplicationHistoryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ApplicationHistories to fetch.
     */
    orderBy?: ApplicationHistoryOrderByWithRelationInput | ApplicationHistoryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing ApplicationHistories.
     */
    cursor?: ApplicationHistoryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ApplicationHistories from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ApplicationHistories.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ApplicationHistories.
     */
    distinct?: ApplicationHistoryScalarFieldEnum | ApplicationHistoryScalarFieldEnum[]
  }

  /**
   * ApplicationHistory create
   */
  export type ApplicationHistoryCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ApplicationHistory
     */
    select?: ApplicationHistorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the ApplicationHistory
     */
    omit?: ApplicationHistoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApplicationHistoryInclude<ExtArgs> | null
    /**
     * The data needed to create a ApplicationHistory.
     */
    data: XOR<ApplicationHistoryCreateInput, ApplicationHistoryUncheckedCreateInput>
  }

  /**
   * ApplicationHistory createMany
   */
  export type ApplicationHistoryCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many ApplicationHistories.
     */
    data: ApplicationHistoryCreateManyInput | ApplicationHistoryCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ApplicationHistory createManyAndReturn
   */
  export type ApplicationHistoryCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ApplicationHistory
     */
    select?: ApplicationHistorySelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ApplicationHistory
     */
    omit?: ApplicationHistoryOmit<ExtArgs> | null
    /**
     * The data used to create many ApplicationHistories.
     */
    data: ApplicationHistoryCreateManyInput | ApplicationHistoryCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ApplicationHistory update
   */
  export type ApplicationHistoryUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ApplicationHistory
     */
    select?: ApplicationHistorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the ApplicationHistory
     */
    omit?: ApplicationHistoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApplicationHistoryInclude<ExtArgs> | null
    /**
     * The data needed to update a ApplicationHistory.
     */
    data: XOR<ApplicationHistoryUpdateInput, ApplicationHistoryUncheckedUpdateInput>
    /**
     * Choose, which ApplicationHistory to update.
     */
    where: ApplicationHistoryWhereUniqueInput
  }

  /**
   * ApplicationHistory updateMany
   */
  export type ApplicationHistoryUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update ApplicationHistories.
     */
    data: XOR<ApplicationHistoryUpdateManyMutationInput, ApplicationHistoryUncheckedUpdateManyInput>
    /**
     * Filter which ApplicationHistories to update
     */
    where?: ApplicationHistoryWhereInput
    /**
     * Limit how many ApplicationHistories to update.
     */
    limit?: number
  }

  /**
   * ApplicationHistory updateManyAndReturn
   */
  export type ApplicationHistoryUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ApplicationHistory
     */
    select?: ApplicationHistorySelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ApplicationHistory
     */
    omit?: ApplicationHistoryOmit<ExtArgs> | null
    /**
     * The data used to update ApplicationHistories.
     */
    data: XOR<ApplicationHistoryUpdateManyMutationInput, ApplicationHistoryUncheckedUpdateManyInput>
    /**
     * Filter which ApplicationHistories to update
     */
    where?: ApplicationHistoryWhereInput
    /**
     * Limit how many ApplicationHistories to update.
     */
    limit?: number
  }

  /**
   * ApplicationHistory upsert
   */
  export type ApplicationHistoryUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ApplicationHistory
     */
    select?: ApplicationHistorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the ApplicationHistory
     */
    omit?: ApplicationHistoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApplicationHistoryInclude<ExtArgs> | null
    /**
     * The filter to search for the ApplicationHistory to update in case it exists.
     */
    where: ApplicationHistoryWhereUniqueInput
    /**
     * In case the ApplicationHistory found by the `where` argument doesn't exist, create a new ApplicationHistory with this data.
     */
    create: XOR<ApplicationHistoryCreateInput, ApplicationHistoryUncheckedCreateInput>
    /**
     * In case the ApplicationHistory was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ApplicationHistoryUpdateInput, ApplicationHistoryUncheckedUpdateInput>
  }

  /**
   * ApplicationHistory delete
   */
  export type ApplicationHistoryDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ApplicationHistory
     */
    select?: ApplicationHistorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the ApplicationHistory
     */
    omit?: ApplicationHistoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApplicationHistoryInclude<ExtArgs> | null
    /**
     * Filter which ApplicationHistory to delete.
     */
    where: ApplicationHistoryWhereUniqueInput
  }

  /**
   * ApplicationHistory deleteMany
   */
  export type ApplicationHistoryDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ApplicationHistories to delete
     */
    where?: ApplicationHistoryWhereInput
    /**
     * Limit how many ApplicationHistories to delete.
     */
    limit?: number
  }

  /**
   * ApplicationHistory.qnaMemories
   */
  export type ApplicationHistory$qnaMemoriesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CustomQnaMemory
     */
    select?: CustomQnaMemorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the CustomQnaMemory
     */
    omit?: CustomQnaMemoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CustomQnaMemoryInclude<ExtArgs> | null
    where?: CustomQnaMemoryWhereInput
    orderBy?: CustomQnaMemoryOrderByWithRelationInput | CustomQnaMemoryOrderByWithRelationInput[]
    cursor?: CustomQnaMemoryWhereUniqueInput
    take?: number
    skip?: number
    distinct?: CustomQnaMemoryScalarFieldEnum | CustomQnaMemoryScalarFieldEnum[]
  }

  /**
   * ApplicationHistory without action
   */
  export type ApplicationHistoryDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ApplicationHistory
     */
    select?: ApplicationHistorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the ApplicationHistory
     */
    omit?: ApplicationHistoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApplicationHistoryInclude<ExtArgs> | null
  }


  /**
   * Model CustomQnaMemory
   */

  export type AggregateCustomQnaMemory = {
    _count: CustomQnaMemoryCountAggregateOutputType | null
    _avg: CustomQnaMemoryAvgAggregateOutputType | null
    _sum: CustomQnaMemorySumAggregateOutputType | null
    _min: CustomQnaMemoryMinAggregateOutputType | null
    _max: CustomQnaMemoryMaxAggregateOutputType | null
  }

  export type CustomQnaMemoryAvgAggregateOutputType = {
    id: number | null
    sourceApplicationId: number | null
  }

  export type CustomQnaMemorySumAggregateOutputType = {
    id: number | null
    sourceApplicationId: number | null
  }

  export type CustomQnaMemoryMinAggregateOutputType = {
    id: number | null
    questionHash: string | null
    questionText: string | null
    answerText: string | null
    sourceApplicationId: number | null
  }

  export type CustomQnaMemoryMaxAggregateOutputType = {
    id: number | null
    questionHash: string | null
    questionText: string | null
    answerText: string | null
    sourceApplicationId: number | null
  }

  export type CustomQnaMemoryCountAggregateOutputType = {
    id: number
    questionHash: number
    questionText: number
    answerText: number
    sourceApplicationId: number
    _all: number
  }


  export type CustomQnaMemoryAvgAggregateInputType = {
    id?: true
    sourceApplicationId?: true
  }

  export type CustomQnaMemorySumAggregateInputType = {
    id?: true
    sourceApplicationId?: true
  }

  export type CustomQnaMemoryMinAggregateInputType = {
    id?: true
    questionHash?: true
    questionText?: true
    answerText?: true
    sourceApplicationId?: true
  }

  export type CustomQnaMemoryMaxAggregateInputType = {
    id?: true
    questionHash?: true
    questionText?: true
    answerText?: true
    sourceApplicationId?: true
  }

  export type CustomQnaMemoryCountAggregateInputType = {
    id?: true
    questionHash?: true
    questionText?: true
    answerText?: true
    sourceApplicationId?: true
    _all?: true
  }

  export type CustomQnaMemoryAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which CustomQnaMemory to aggregate.
     */
    where?: CustomQnaMemoryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CustomQnaMemories to fetch.
     */
    orderBy?: CustomQnaMemoryOrderByWithRelationInput | CustomQnaMemoryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: CustomQnaMemoryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CustomQnaMemories from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CustomQnaMemories.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned CustomQnaMemories
    **/
    _count?: true | CustomQnaMemoryCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: CustomQnaMemoryAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: CustomQnaMemorySumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: CustomQnaMemoryMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: CustomQnaMemoryMaxAggregateInputType
  }

  export type GetCustomQnaMemoryAggregateType<T extends CustomQnaMemoryAggregateArgs> = {
        [P in keyof T & keyof AggregateCustomQnaMemory]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateCustomQnaMemory[P]>
      : GetScalarType<T[P], AggregateCustomQnaMemory[P]>
  }




  export type CustomQnaMemoryGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: CustomQnaMemoryWhereInput
    orderBy?: CustomQnaMemoryOrderByWithAggregationInput | CustomQnaMemoryOrderByWithAggregationInput[]
    by: CustomQnaMemoryScalarFieldEnum[] | CustomQnaMemoryScalarFieldEnum
    having?: CustomQnaMemoryScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: CustomQnaMemoryCountAggregateInputType | true
    _avg?: CustomQnaMemoryAvgAggregateInputType
    _sum?: CustomQnaMemorySumAggregateInputType
    _min?: CustomQnaMemoryMinAggregateInputType
    _max?: CustomQnaMemoryMaxAggregateInputType
  }

  export type CustomQnaMemoryGroupByOutputType = {
    id: number
    questionHash: string
    questionText: string
    answerText: string
    sourceApplicationId: number
    _count: CustomQnaMemoryCountAggregateOutputType | null
    _avg: CustomQnaMemoryAvgAggregateOutputType | null
    _sum: CustomQnaMemorySumAggregateOutputType | null
    _min: CustomQnaMemoryMinAggregateOutputType | null
    _max: CustomQnaMemoryMaxAggregateOutputType | null
  }

  type GetCustomQnaMemoryGroupByPayload<T extends CustomQnaMemoryGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<CustomQnaMemoryGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof CustomQnaMemoryGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], CustomQnaMemoryGroupByOutputType[P]>
            : GetScalarType<T[P], CustomQnaMemoryGroupByOutputType[P]>
        }
      >
    >


  export type CustomQnaMemorySelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    questionHash?: boolean
    questionText?: boolean
    answerText?: boolean
    sourceApplicationId?: boolean
    sourceApplication?: boolean | ApplicationHistoryDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["customQnaMemory"]>

  export type CustomQnaMemorySelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    questionHash?: boolean
    questionText?: boolean
    answerText?: boolean
    sourceApplicationId?: boolean
    sourceApplication?: boolean | ApplicationHistoryDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["customQnaMemory"]>

  export type CustomQnaMemorySelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    questionHash?: boolean
    questionText?: boolean
    answerText?: boolean
    sourceApplicationId?: boolean
    sourceApplication?: boolean | ApplicationHistoryDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["customQnaMemory"]>

  export type CustomQnaMemorySelectScalar = {
    id?: boolean
    questionHash?: boolean
    questionText?: boolean
    answerText?: boolean
    sourceApplicationId?: boolean
  }

  export type CustomQnaMemoryOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "questionHash" | "questionText" | "answerText" | "sourceApplicationId", ExtArgs["result"]["customQnaMemory"]>
  export type CustomQnaMemoryInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    sourceApplication?: boolean | ApplicationHistoryDefaultArgs<ExtArgs>
  }
  export type CustomQnaMemoryIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    sourceApplication?: boolean | ApplicationHistoryDefaultArgs<ExtArgs>
  }
  export type CustomQnaMemoryIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    sourceApplication?: boolean | ApplicationHistoryDefaultArgs<ExtArgs>
  }

  export type $CustomQnaMemoryPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "CustomQnaMemory"
    objects: {
      sourceApplication: Prisma.$ApplicationHistoryPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      questionHash: string
      questionText: string
      answerText: string
      sourceApplicationId: number
    }, ExtArgs["result"]["customQnaMemory"]>
    composites: {}
  }

  type CustomQnaMemoryGetPayload<S extends boolean | null | undefined | CustomQnaMemoryDefaultArgs> = $Result.GetResult<Prisma.$CustomQnaMemoryPayload, S>

  type CustomQnaMemoryCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<CustomQnaMemoryFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: CustomQnaMemoryCountAggregateInputType | true
    }

  export interface CustomQnaMemoryDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['CustomQnaMemory'], meta: { name: 'CustomQnaMemory' } }
    /**
     * Find zero or one CustomQnaMemory that matches the filter.
     * @param {CustomQnaMemoryFindUniqueArgs} args - Arguments to find a CustomQnaMemory
     * @example
     * // Get one CustomQnaMemory
     * const customQnaMemory = await prisma.customQnaMemory.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends CustomQnaMemoryFindUniqueArgs>(args: SelectSubset<T, CustomQnaMemoryFindUniqueArgs<ExtArgs>>): Prisma__CustomQnaMemoryClient<$Result.GetResult<Prisma.$CustomQnaMemoryPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one CustomQnaMemory that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {CustomQnaMemoryFindUniqueOrThrowArgs} args - Arguments to find a CustomQnaMemory
     * @example
     * // Get one CustomQnaMemory
     * const customQnaMemory = await prisma.customQnaMemory.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends CustomQnaMemoryFindUniqueOrThrowArgs>(args: SelectSubset<T, CustomQnaMemoryFindUniqueOrThrowArgs<ExtArgs>>): Prisma__CustomQnaMemoryClient<$Result.GetResult<Prisma.$CustomQnaMemoryPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first CustomQnaMemory that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CustomQnaMemoryFindFirstArgs} args - Arguments to find a CustomQnaMemory
     * @example
     * // Get one CustomQnaMemory
     * const customQnaMemory = await prisma.customQnaMemory.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends CustomQnaMemoryFindFirstArgs>(args?: SelectSubset<T, CustomQnaMemoryFindFirstArgs<ExtArgs>>): Prisma__CustomQnaMemoryClient<$Result.GetResult<Prisma.$CustomQnaMemoryPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first CustomQnaMemory that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CustomQnaMemoryFindFirstOrThrowArgs} args - Arguments to find a CustomQnaMemory
     * @example
     * // Get one CustomQnaMemory
     * const customQnaMemory = await prisma.customQnaMemory.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends CustomQnaMemoryFindFirstOrThrowArgs>(args?: SelectSubset<T, CustomQnaMemoryFindFirstOrThrowArgs<ExtArgs>>): Prisma__CustomQnaMemoryClient<$Result.GetResult<Prisma.$CustomQnaMemoryPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more CustomQnaMemories that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CustomQnaMemoryFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all CustomQnaMemories
     * const customQnaMemories = await prisma.customQnaMemory.findMany()
     * 
     * // Get first 10 CustomQnaMemories
     * const customQnaMemories = await prisma.customQnaMemory.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const customQnaMemoryWithIdOnly = await prisma.customQnaMemory.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends CustomQnaMemoryFindManyArgs>(args?: SelectSubset<T, CustomQnaMemoryFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CustomQnaMemoryPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a CustomQnaMemory.
     * @param {CustomQnaMemoryCreateArgs} args - Arguments to create a CustomQnaMemory.
     * @example
     * // Create one CustomQnaMemory
     * const CustomQnaMemory = await prisma.customQnaMemory.create({
     *   data: {
     *     // ... data to create a CustomQnaMemory
     *   }
     * })
     * 
     */
    create<T extends CustomQnaMemoryCreateArgs>(args: SelectSubset<T, CustomQnaMemoryCreateArgs<ExtArgs>>): Prisma__CustomQnaMemoryClient<$Result.GetResult<Prisma.$CustomQnaMemoryPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many CustomQnaMemories.
     * @param {CustomQnaMemoryCreateManyArgs} args - Arguments to create many CustomQnaMemories.
     * @example
     * // Create many CustomQnaMemories
     * const customQnaMemory = await prisma.customQnaMemory.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends CustomQnaMemoryCreateManyArgs>(args?: SelectSubset<T, CustomQnaMemoryCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many CustomQnaMemories and returns the data saved in the database.
     * @param {CustomQnaMemoryCreateManyAndReturnArgs} args - Arguments to create many CustomQnaMemories.
     * @example
     * // Create many CustomQnaMemories
     * const customQnaMemory = await prisma.customQnaMemory.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many CustomQnaMemories and only return the `id`
     * const customQnaMemoryWithIdOnly = await prisma.customQnaMemory.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends CustomQnaMemoryCreateManyAndReturnArgs>(args?: SelectSubset<T, CustomQnaMemoryCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CustomQnaMemoryPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a CustomQnaMemory.
     * @param {CustomQnaMemoryDeleteArgs} args - Arguments to delete one CustomQnaMemory.
     * @example
     * // Delete one CustomQnaMemory
     * const CustomQnaMemory = await prisma.customQnaMemory.delete({
     *   where: {
     *     // ... filter to delete one CustomQnaMemory
     *   }
     * })
     * 
     */
    delete<T extends CustomQnaMemoryDeleteArgs>(args: SelectSubset<T, CustomQnaMemoryDeleteArgs<ExtArgs>>): Prisma__CustomQnaMemoryClient<$Result.GetResult<Prisma.$CustomQnaMemoryPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one CustomQnaMemory.
     * @param {CustomQnaMemoryUpdateArgs} args - Arguments to update one CustomQnaMemory.
     * @example
     * // Update one CustomQnaMemory
     * const customQnaMemory = await prisma.customQnaMemory.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends CustomQnaMemoryUpdateArgs>(args: SelectSubset<T, CustomQnaMemoryUpdateArgs<ExtArgs>>): Prisma__CustomQnaMemoryClient<$Result.GetResult<Prisma.$CustomQnaMemoryPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more CustomQnaMemories.
     * @param {CustomQnaMemoryDeleteManyArgs} args - Arguments to filter CustomQnaMemories to delete.
     * @example
     * // Delete a few CustomQnaMemories
     * const { count } = await prisma.customQnaMemory.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends CustomQnaMemoryDeleteManyArgs>(args?: SelectSubset<T, CustomQnaMemoryDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more CustomQnaMemories.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CustomQnaMemoryUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many CustomQnaMemories
     * const customQnaMemory = await prisma.customQnaMemory.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends CustomQnaMemoryUpdateManyArgs>(args: SelectSubset<T, CustomQnaMemoryUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more CustomQnaMemories and returns the data updated in the database.
     * @param {CustomQnaMemoryUpdateManyAndReturnArgs} args - Arguments to update many CustomQnaMemories.
     * @example
     * // Update many CustomQnaMemories
     * const customQnaMemory = await prisma.customQnaMemory.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more CustomQnaMemories and only return the `id`
     * const customQnaMemoryWithIdOnly = await prisma.customQnaMemory.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends CustomQnaMemoryUpdateManyAndReturnArgs>(args: SelectSubset<T, CustomQnaMemoryUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CustomQnaMemoryPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one CustomQnaMemory.
     * @param {CustomQnaMemoryUpsertArgs} args - Arguments to update or create a CustomQnaMemory.
     * @example
     * // Update or create a CustomQnaMemory
     * const customQnaMemory = await prisma.customQnaMemory.upsert({
     *   create: {
     *     // ... data to create a CustomQnaMemory
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the CustomQnaMemory we want to update
     *   }
     * })
     */
    upsert<T extends CustomQnaMemoryUpsertArgs>(args: SelectSubset<T, CustomQnaMemoryUpsertArgs<ExtArgs>>): Prisma__CustomQnaMemoryClient<$Result.GetResult<Prisma.$CustomQnaMemoryPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of CustomQnaMemories.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CustomQnaMemoryCountArgs} args - Arguments to filter CustomQnaMemories to count.
     * @example
     * // Count the number of CustomQnaMemories
     * const count = await prisma.customQnaMemory.count({
     *   where: {
     *     // ... the filter for the CustomQnaMemories we want to count
     *   }
     * })
    **/
    count<T extends CustomQnaMemoryCountArgs>(
      args?: Subset<T, CustomQnaMemoryCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], CustomQnaMemoryCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a CustomQnaMemory.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CustomQnaMemoryAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends CustomQnaMemoryAggregateArgs>(args: Subset<T, CustomQnaMemoryAggregateArgs>): Prisma.PrismaPromise<GetCustomQnaMemoryAggregateType<T>>

    /**
     * Group by CustomQnaMemory.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CustomQnaMemoryGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends CustomQnaMemoryGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: CustomQnaMemoryGroupByArgs['orderBy'] }
        : { orderBy?: CustomQnaMemoryGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, CustomQnaMemoryGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetCustomQnaMemoryGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the CustomQnaMemory model
   */
  readonly fields: CustomQnaMemoryFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for CustomQnaMemory.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__CustomQnaMemoryClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    sourceApplication<T extends ApplicationHistoryDefaultArgs<ExtArgs> = {}>(args?: Subset<T, ApplicationHistoryDefaultArgs<ExtArgs>>): Prisma__ApplicationHistoryClient<$Result.GetResult<Prisma.$ApplicationHistoryPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the CustomQnaMemory model
   */
  interface CustomQnaMemoryFieldRefs {
    readonly id: FieldRef<"CustomQnaMemory", 'Int'>
    readonly questionHash: FieldRef<"CustomQnaMemory", 'String'>
    readonly questionText: FieldRef<"CustomQnaMemory", 'String'>
    readonly answerText: FieldRef<"CustomQnaMemory", 'String'>
    readonly sourceApplicationId: FieldRef<"CustomQnaMemory", 'Int'>
  }
    

  // Custom InputTypes
  /**
   * CustomQnaMemory findUnique
   */
  export type CustomQnaMemoryFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CustomQnaMemory
     */
    select?: CustomQnaMemorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the CustomQnaMemory
     */
    omit?: CustomQnaMemoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CustomQnaMemoryInclude<ExtArgs> | null
    /**
     * Filter, which CustomQnaMemory to fetch.
     */
    where: CustomQnaMemoryWhereUniqueInput
  }

  /**
   * CustomQnaMemory findUniqueOrThrow
   */
  export type CustomQnaMemoryFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CustomQnaMemory
     */
    select?: CustomQnaMemorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the CustomQnaMemory
     */
    omit?: CustomQnaMemoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CustomQnaMemoryInclude<ExtArgs> | null
    /**
     * Filter, which CustomQnaMemory to fetch.
     */
    where: CustomQnaMemoryWhereUniqueInput
  }

  /**
   * CustomQnaMemory findFirst
   */
  export type CustomQnaMemoryFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CustomQnaMemory
     */
    select?: CustomQnaMemorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the CustomQnaMemory
     */
    omit?: CustomQnaMemoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CustomQnaMemoryInclude<ExtArgs> | null
    /**
     * Filter, which CustomQnaMemory to fetch.
     */
    where?: CustomQnaMemoryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CustomQnaMemories to fetch.
     */
    orderBy?: CustomQnaMemoryOrderByWithRelationInput | CustomQnaMemoryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for CustomQnaMemories.
     */
    cursor?: CustomQnaMemoryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CustomQnaMemories from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CustomQnaMemories.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of CustomQnaMemories.
     */
    distinct?: CustomQnaMemoryScalarFieldEnum | CustomQnaMemoryScalarFieldEnum[]
  }

  /**
   * CustomQnaMemory findFirstOrThrow
   */
  export type CustomQnaMemoryFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CustomQnaMemory
     */
    select?: CustomQnaMemorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the CustomQnaMemory
     */
    omit?: CustomQnaMemoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CustomQnaMemoryInclude<ExtArgs> | null
    /**
     * Filter, which CustomQnaMemory to fetch.
     */
    where?: CustomQnaMemoryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CustomQnaMemories to fetch.
     */
    orderBy?: CustomQnaMemoryOrderByWithRelationInput | CustomQnaMemoryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for CustomQnaMemories.
     */
    cursor?: CustomQnaMemoryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CustomQnaMemories from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CustomQnaMemories.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of CustomQnaMemories.
     */
    distinct?: CustomQnaMemoryScalarFieldEnum | CustomQnaMemoryScalarFieldEnum[]
  }

  /**
   * CustomQnaMemory findMany
   */
  export type CustomQnaMemoryFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CustomQnaMemory
     */
    select?: CustomQnaMemorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the CustomQnaMemory
     */
    omit?: CustomQnaMemoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CustomQnaMemoryInclude<ExtArgs> | null
    /**
     * Filter, which CustomQnaMemories to fetch.
     */
    where?: CustomQnaMemoryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CustomQnaMemories to fetch.
     */
    orderBy?: CustomQnaMemoryOrderByWithRelationInput | CustomQnaMemoryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing CustomQnaMemories.
     */
    cursor?: CustomQnaMemoryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CustomQnaMemories from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CustomQnaMemories.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of CustomQnaMemories.
     */
    distinct?: CustomQnaMemoryScalarFieldEnum | CustomQnaMemoryScalarFieldEnum[]
  }

  /**
   * CustomQnaMemory create
   */
  export type CustomQnaMemoryCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CustomQnaMemory
     */
    select?: CustomQnaMemorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the CustomQnaMemory
     */
    omit?: CustomQnaMemoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CustomQnaMemoryInclude<ExtArgs> | null
    /**
     * The data needed to create a CustomQnaMemory.
     */
    data: XOR<CustomQnaMemoryCreateInput, CustomQnaMemoryUncheckedCreateInput>
  }

  /**
   * CustomQnaMemory createMany
   */
  export type CustomQnaMemoryCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many CustomQnaMemories.
     */
    data: CustomQnaMemoryCreateManyInput | CustomQnaMemoryCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * CustomQnaMemory createManyAndReturn
   */
  export type CustomQnaMemoryCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CustomQnaMemory
     */
    select?: CustomQnaMemorySelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the CustomQnaMemory
     */
    omit?: CustomQnaMemoryOmit<ExtArgs> | null
    /**
     * The data used to create many CustomQnaMemories.
     */
    data: CustomQnaMemoryCreateManyInput | CustomQnaMemoryCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CustomQnaMemoryIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * CustomQnaMemory update
   */
  export type CustomQnaMemoryUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CustomQnaMemory
     */
    select?: CustomQnaMemorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the CustomQnaMemory
     */
    omit?: CustomQnaMemoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CustomQnaMemoryInclude<ExtArgs> | null
    /**
     * The data needed to update a CustomQnaMemory.
     */
    data: XOR<CustomQnaMemoryUpdateInput, CustomQnaMemoryUncheckedUpdateInput>
    /**
     * Choose, which CustomQnaMemory to update.
     */
    where: CustomQnaMemoryWhereUniqueInput
  }

  /**
   * CustomQnaMemory updateMany
   */
  export type CustomQnaMemoryUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update CustomQnaMemories.
     */
    data: XOR<CustomQnaMemoryUpdateManyMutationInput, CustomQnaMemoryUncheckedUpdateManyInput>
    /**
     * Filter which CustomQnaMemories to update
     */
    where?: CustomQnaMemoryWhereInput
    /**
     * Limit how many CustomQnaMemories to update.
     */
    limit?: number
  }

  /**
   * CustomQnaMemory updateManyAndReturn
   */
  export type CustomQnaMemoryUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CustomQnaMemory
     */
    select?: CustomQnaMemorySelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the CustomQnaMemory
     */
    omit?: CustomQnaMemoryOmit<ExtArgs> | null
    /**
     * The data used to update CustomQnaMemories.
     */
    data: XOR<CustomQnaMemoryUpdateManyMutationInput, CustomQnaMemoryUncheckedUpdateManyInput>
    /**
     * Filter which CustomQnaMemories to update
     */
    where?: CustomQnaMemoryWhereInput
    /**
     * Limit how many CustomQnaMemories to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CustomQnaMemoryIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * CustomQnaMemory upsert
   */
  export type CustomQnaMemoryUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CustomQnaMemory
     */
    select?: CustomQnaMemorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the CustomQnaMemory
     */
    omit?: CustomQnaMemoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CustomQnaMemoryInclude<ExtArgs> | null
    /**
     * The filter to search for the CustomQnaMemory to update in case it exists.
     */
    where: CustomQnaMemoryWhereUniqueInput
    /**
     * In case the CustomQnaMemory found by the `where` argument doesn't exist, create a new CustomQnaMemory with this data.
     */
    create: XOR<CustomQnaMemoryCreateInput, CustomQnaMemoryUncheckedCreateInput>
    /**
     * In case the CustomQnaMemory was found with the provided `where` argument, update it with this data.
     */
    update: XOR<CustomQnaMemoryUpdateInput, CustomQnaMemoryUncheckedUpdateInput>
  }

  /**
   * CustomQnaMemory delete
   */
  export type CustomQnaMemoryDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CustomQnaMemory
     */
    select?: CustomQnaMemorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the CustomQnaMemory
     */
    omit?: CustomQnaMemoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CustomQnaMemoryInclude<ExtArgs> | null
    /**
     * Filter which CustomQnaMemory to delete.
     */
    where: CustomQnaMemoryWhereUniqueInput
  }

  /**
   * CustomQnaMemory deleteMany
   */
  export type CustomQnaMemoryDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which CustomQnaMemories to delete
     */
    where?: CustomQnaMemoryWhereInput
    /**
     * Limit how many CustomQnaMemories to delete.
     */
    limit?: number
  }

  /**
   * CustomQnaMemory without action
   */
  export type CustomQnaMemoryDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CustomQnaMemory
     */
    select?: CustomQnaMemorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the CustomQnaMemory
     */
    omit?: CustomQnaMemoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CustomQnaMemoryInclude<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const MasterProfileScalarFieldEnum: {
    id: 'id',
    data: 'data',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type MasterProfileScalarFieldEnum = (typeof MasterProfileScalarFieldEnum)[keyof typeof MasterProfileScalarFieldEnum]


  export const ApplicationHistoryScalarFieldEnum: {
    id: 'id',
    jobUrl: 'jobUrl',
    atsPlatform: 'atsPlatform',
    jobTitle: 'jobTitle',
    company: 'company',
    matchScore: 'matchScore',
    status: 'status',
    stepsLog: 'stepsLog',
    customQuestions: 'customQuestions',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type ApplicationHistoryScalarFieldEnum = (typeof ApplicationHistoryScalarFieldEnum)[keyof typeof ApplicationHistoryScalarFieldEnum]


  export const CustomQnaMemoryScalarFieldEnum: {
    id: 'id',
    questionHash: 'questionHash',
    questionText: 'questionText',
    answerText: 'answerText',
    sourceApplicationId: 'sourceApplicationId'
  };

  export type CustomQnaMemoryScalarFieldEnum = (typeof CustomQnaMemoryScalarFieldEnum)[keyof typeof CustomQnaMemoryScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const JsonNullValueInput: {
    JsonNull: typeof JsonNull
  };

  export type JsonNullValueInput = (typeof JsonNullValueInput)[keyof typeof JsonNullValueInput]


  export const JsonNullValueFilter: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull,
    AnyNull: typeof AnyNull
  };

  export type JsonNullValueFilter = (typeof JsonNullValueFilter)[keyof typeof JsonNullValueFilter]


  export const QueryMode: {
    default: 'default',
    insensitive: 'insensitive'
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  /**
   * Field references
   */


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


  /**
   * Reference to a field of type 'Json'
   */
  export type JsonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Json'>
    


  /**
   * Reference to a field of type 'QueryMode'
   */
  export type EnumQueryModeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'QueryMode'>
    


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    


  /**
   * Reference to a field of type 'String[]'
   */
  export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'Float[]'
   */
  export type ListFloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float[]'>
    
  /**
   * Deep Input Types
   */


  export type MasterProfileWhereInput = {
    AND?: MasterProfileWhereInput | MasterProfileWhereInput[]
    OR?: MasterProfileWhereInput[]
    NOT?: MasterProfileWhereInput | MasterProfileWhereInput[]
    id?: IntFilter<"MasterProfile"> | number
    data?: JsonFilter<"MasterProfile">
    createdAt?: DateTimeFilter<"MasterProfile"> | Date | string
    updatedAt?: DateTimeFilter<"MasterProfile"> | Date | string
  }

  export type MasterProfileOrderByWithRelationInput = {
    id?: SortOrder
    data?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type MasterProfileWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: MasterProfileWhereInput | MasterProfileWhereInput[]
    OR?: MasterProfileWhereInput[]
    NOT?: MasterProfileWhereInput | MasterProfileWhereInput[]
    data?: JsonFilter<"MasterProfile">
    createdAt?: DateTimeFilter<"MasterProfile"> | Date | string
    updatedAt?: DateTimeFilter<"MasterProfile"> | Date | string
  }, "id">

  export type MasterProfileOrderByWithAggregationInput = {
    id?: SortOrder
    data?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: MasterProfileCountOrderByAggregateInput
    _avg?: MasterProfileAvgOrderByAggregateInput
    _max?: MasterProfileMaxOrderByAggregateInput
    _min?: MasterProfileMinOrderByAggregateInput
    _sum?: MasterProfileSumOrderByAggregateInput
  }

  export type MasterProfileScalarWhereWithAggregatesInput = {
    AND?: MasterProfileScalarWhereWithAggregatesInput | MasterProfileScalarWhereWithAggregatesInput[]
    OR?: MasterProfileScalarWhereWithAggregatesInput[]
    NOT?: MasterProfileScalarWhereWithAggregatesInput | MasterProfileScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"MasterProfile"> | number
    data?: JsonWithAggregatesFilter<"MasterProfile">
    createdAt?: DateTimeWithAggregatesFilter<"MasterProfile"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"MasterProfile"> | Date | string
  }

  export type ApplicationHistoryWhereInput = {
    AND?: ApplicationHistoryWhereInput | ApplicationHistoryWhereInput[]
    OR?: ApplicationHistoryWhereInput[]
    NOT?: ApplicationHistoryWhereInput | ApplicationHistoryWhereInput[]
    id?: IntFilter<"ApplicationHistory"> | number
    jobUrl?: StringFilter<"ApplicationHistory"> | string
    atsPlatform?: StringFilter<"ApplicationHistory"> | string
    jobTitle?: StringFilter<"ApplicationHistory"> | string
    company?: StringFilter<"ApplicationHistory"> | string
    matchScore?: FloatNullableFilter<"ApplicationHistory"> | number | null
    status?: StringFilter<"ApplicationHistory"> | string
    stepsLog?: JsonFilter<"ApplicationHistory">
    customQuestions?: JsonFilter<"ApplicationHistory">
    createdAt?: DateTimeFilter<"ApplicationHistory"> | Date | string
    updatedAt?: DateTimeFilter<"ApplicationHistory"> | Date | string
    qnaMemories?: CustomQnaMemoryListRelationFilter
  }

  export type ApplicationHistoryOrderByWithRelationInput = {
    id?: SortOrder
    jobUrl?: SortOrder
    atsPlatform?: SortOrder
    jobTitle?: SortOrder
    company?: SortOrder
    matchScore?: SortOrderInput | SortOrder
    status?: SortOrder
    stepsLog?: SortOrder
    customQuestions?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    qnaMemories?: CustomQnaMemoryOrderByRelationAggregateInput
  }

  export type ApplicationHistoryWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: ApplicationHistoryWhereInput | ApplicationHistoryWhereInput[]
    OR?: ApplicationHistoryWhereInput[]
    NOT?: ApplicationHistoryWhereInput | ApplicationHistoryWhereInput[]
    jobUrl?: StringFilter<"ApplicationHistory"> | string
    atsPlatform?: StringFilter<"ApplicationHistory"> | string
    jobTitle?: StringFilter<"ApplicationHistory"> | string
    company?: StringFilter<"ApplicationHistory"> | string
    matchScore?: FloatNullableFilter<"ApplicationHistory"> | number | null
    status?: StringFilter<"ApplicationHistory"> | string
    stepsLog?: JsonFilter<"ApplicationHistory">
    customQuestions?: JsonFilter<"ApplicationHistory">
    createdAt?: DateTimeFilter<"ApplicationHistory"> | Date | string
    updatedAt?: DateTimeFilter<"ApplicationHistory"> | Date | string
    qnaMemories?: CustomQnaMemoryListRelationFilter
  }, "id">

  export type ApplicationHistoryOrderByWithAggregationInput = {
    id?: SortOrder
    jobUrl?: SortOrder
    atsPlatform?: SortOrder
    jobTitle?: SortOrder
    company?: SortOrder
    matchScore?: SortOrderInput | SortOrder
    status?: SortOrder
    stepsLog?: SortOrder
    customQuestions?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: ApplicationHistoryCountOrderByAggregateInput
    _avg?: ApplicationHistoryAvgOrderByAggregateInput
    _max?: ApplicationHistoryMaxOrderByAggregateInput
    _min?: ApplicationHistoryMinOrderByAggregateInput
    _sum?: ApplicationHistorySumOrderByAggregateInput
  }

  export type ApplicationHistoryScalarWhereWithAggregatesInput = {
    AND?: ApplicationHistoryScalarWhereWithAggregatesInput | ApplicationHistoryScalarWhereWithAggregatesInput[]
    OR?: ApplicationHistoryScalarWhereWithAggregatesInput[]
    NOT?: ApplicationHistoryScalarWhereWithAggregatesInput | ApplicationHistoryScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"ApplicationHistory"> | number
    jobUrl?: StringWithAggregatesFilter<"ApplicationHistory"> | string
    atsPlatform?: StringWithAggregatesFilter<"ApplicationHistory"> | string
    jobTitle?: StringWithAggregatesFilter<"ApplicationHistory"> | string
    company?: StringWithAggregatesFilter<"ApplicationHistory"> | string
    matchScore?: FloatNullableWithAggregatesFilter<"ApplicationHistory"> | number | null
    status?: StringWithAggregatesFilter<"ApplicationHistory"> | string
    stepsLog?: JsonWithAggregatesFilter<"ApplicationHistory">
    customQuestions?: JsonWithAggregatesFilter<"ApplicationHistory">
    createdAt?: DateTimeWithAggregatesFilter<"ApplicationHistory"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"ApplicationHistory"> | Date | string
  }

  export type CustomQnaMemoryWhereInput = {
    AND?: CustomQnaMemoryWhereInput | CustomQnaMemoryWhereInput[]
    OR?: CustomQnaMemoryWhereInput[]
    NOT?: CustomQnaMemoryWhereInput | CustomQnaMemoryWhereInput[]
    id?: IntFilter<"CustomQnaMemory"> | number
    questionHash?: StringFilter<"CustomQnaMemory"> | string
    questionText?: StringFilter<"CustomQnaMemory"> | string
    answerText?: StringFilter<"CustomQnaMemory"> | string
    sourceApplicationId?: IntFilter<"CustomQnaMemory"> | number
    sourceApplication?: XOR<ApplicationHistoryScalarRelationFilter, ApplicationHistoryWhereInput>
  }

  export type CustomQnaMemoryOrderByWithRelationInput = {
    id?: SortOrder
    questionHash?: SortOrder
    questionText?: SortOrder
    answerText?: SortOrder
    sourceApplicationId?: SortOrder
    sourceApplication?: ApplicationHistoryOrderByWithRelationInput
  }

  export type CustomQnaMemoryWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    questionHash?: string
    AND?: CustomQnaMemoryWhereInput | CustomQnaMemoryWhereInput[]
    OR?: CustomQnaMemoryWhereInput[]
    NOT?: CustomQnaMemoryWhereInput | CustomQnaMemoryWhereInput[]
    questionText?: StringFilter<"CustomQnaMemory"> | string
    answerText?: StringFilter<"CustomQnaMemory"> | string
    sourceApplicationId?: IntFilter<"CustomQnaMemory"> | number
    sourceApplication?: XOR<ApplicationHistoryScalarRelationFilter, ApplicationHistoryWhereInput>
  }, "id" | "questionHash">

  export type CustomQnaMemoryOrderByWithAggregationInput = {
    id?: SortOrder
    questionHash?: SortOrder
    questionText?: SortOrder
    answerText?: SortOrder
    sourceApplicationId?: SortOrder
    _count?: CustomQnaMemoryCountOrderByAggregateInput
    _avg?: CustomQnaMemoryAvgOrderByAggregateInput
    _max?: CustomQnaMemoryMaxOrderByAggregateInput
    _min?: CustomQnaMemoryMinOrderByAggregateInput
    _sum?: CustomQnaMemorySumOrderByAggregateInput
  }

  export type CustomQnaMemoryScalarWhereWithAggregatesInput = {
    AND?: CustomQnaMemoryScalarWhereWithAggregatesInput | CustomQnaMemoryScalarWhereWithAggregatesInput[]
    OR?: CustomQnaMemoryScalarWhereWithAggregatesInput[]
    NOT?: CustomQnaMemoryScalarWhereWithAggregatesInput | CustomQnaMemoryScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"CustomQnaMemory"> | number
    questionHash?: StringWithAggregatesFilter<"CustomQnaMemory"> | string
    questionText?: StringWithAggregatesFilter<"CustomQnaMemory"> | string
    answerText?: StringWithAggregatesFilter<"CustomQnaMemory"> | string
    sourceApplicationId?: IntWithAggregatesFilter<"CustomQnaMemory"> | number
  }

  export type MasterProfileCreateInput = {
    data: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type MasterProfileUncheckedCreateInput = {
    id?: number
    data: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type MasterProfileUpdateInput = {
    data?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type MasterProfileUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    data?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type MasterProfileCreateManyInput = {
    id?: number
    data: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type MasterProfileUpdateManyMutationInput = {
    data?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type MasterProfileUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    data?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ApplicationHistoryCreateInput = {
    jobUrl: string
    atsPlatform: string
    jobTitle: string
    company: string
    matchScore?: number | null
    status?: string
    stepsLog?: JsonNullValueInput | InputJsonValue
    customQuestions?: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
    qnaMemories?: CustomQnaMemoryCreateNestedManyWithoutSourceApplicationInput
  }

  export type ApplicationHistoryUncheckedCreateInput = {
    id?: number
    jobUrl: string
    atsPlatform: string
    jobTitle: string
    company: string
    matchScore?: number | null
    status?: string
    stepsLog?: JsonNullValueInput | InputJsonValue
    customQuestions?: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
    qnaMemories?: CustomQnaMemoryUncheckedCreateNestedManyWithoutSourceApplicationInput
  }

  export type ApplicationHistoryUpdateInput = {
    jobUrl?: StringFieldUpdateOperationsInput | string
    atsPlatform?: StringFieldUpdateOperationsInput | string
    jobTitle?: StringFieldUpdateOperationsInput | string
    company?: StringFieldUpdateOperationsInput | string
    matchScore?: NullableFloatFieldUpdateOperationsInput | number | null
    status?: StringFieldUpdateOperationsInput | string
    stepsLog?: JsonNullValueInput | InputJsonValue
    customQuestions?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    qnaMemories?: CustomQnaMemoryUpdateManyWithoutSourceApplicationNestedInput
  }

  export type ApplicationHistoryUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    jobUrl?: StringFieldUpdateOperationsInput | string
    atsPlatform?: StringFieldUpdateOperationsInput | string
    jobTitle?: StringFieldUpdateOperationsInput | string
    company?: StringFieldUpdateOperationsInput | string
    matchScore?: NullableFloatFieldUpdateOperationsInput | number | null
    status?: StringFieldUpdateOperationsInput | string
    stepsLog?: JsonNullValueInput | InputJsonValue
    customQuestions?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    qnaMemories?: CustomQnaMemoryUncheckedUpdateManyWithoutSourceApplicationNestedInput
  }

  export type ApplicationHistoryCreateManyInput = {
    id?: number
    jobUrl: string
    atsPlatform: string
    jobTitle: string
    company: string
    matchScore?: number | null
    status?: string
    stepsLog?: JsonNullValueInput | InputJsonValue
    customQuestions?: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ApplicationHistoryUpdateManyMutationInput = {
    jobUrl?: StringFieldUpdateOperationsInput | string
    atsPlatform?: StringFieldUpdateOperationsInput | string
    jobTitle?: StringFieldUpdateOperationsInput | string
    company?: StringFieldUpdateOperationsInput | string
    matchScore?: NullableFloatFieldUpdateOperationsInput | number | null
    status?: StringFieldUpdateOperationsInput | string
    stepsLog?: JsonNullValueInput | InputJsonValue
    customQuestions?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ApplicationHistoryUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    jobUrl?: StringFieldUpdateOperationsInput | string
    atsPlatform?: StringFieldUpdateOperationsInput | string
    jobTitle?: StringFieldUpdateOperationsInput | string
    company?: StringFieldUpdateOperationsInput | string
    matchScore?: NullableFloatFieldUpdateOperationsInput | number | null
    status?: StringFieldUpdateOperationsInput | string
    stepsLog?: JsonNullValueInput | InputJsonValue
    customQuestions?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CustomQnaMemoryCreateInput = {
    questionHash: string
    questionText: string
    answerText: string
    sourceApplication: ApplicationHistoryCreateNestedOneWithoutQnaMemoriesInput
  }

  export type CustomQnaMemoryUncheckedCreateInput = {
    id?: number
    questionHash: string
    questionText: string
    answerText: string
    sourceApplicationId: number
  }

  export type CustomQnaMemoryUpdateInput = {
    questionHash?: StringFieldUpdateOperationsInput | string
    questionText?: StringFieldUpdateOperationsInput | string
    answerText?: StringFieldUpdateOperationsInput | string
    sourceApplication?: ApplicationHistoryUpdateOneRequiredWithoutQnaMemoriesNestedInput
  }

  export type CustomQnaMemoryUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    questionHash?: StringFieldUpdateOperationsInput | string
    questionText?: StringFieldUpdateOperationsInput | string
    answerText?: StringFieldUpdateOperationsInput | string
    sourceApplicationId?: IntFieldUpdateOperationsInput | number
  }

  export type CustomQnaMemoryCreateManyInput = {
    id?: number
    questionHash: string
    questionText: string
    answerText: string
    sourceApplicationId: number
  }

  export type CustomQnaMemoryUpdateManyMutationInput = {
    questionHash?: StringFieldUpdateOperationsInput | string
    questionText?: StringFieldUpdateOperationsInput | string
    answerText?: StringFieldUpdateOperationsInput | string
  }

  export type CustomQnaMemoryUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    questionHash?: StringFieldUpdateOperationsInput | string
    questionText?: StringFieldUpdateOperationsInput | string
    answerText?: StringFieldUpdateOperationsInput | string
    sourceApplicationId?: IntFieldUpdateOperationsInput | number
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }
  export type JsonFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonFilterBase<$PrismaModel>>, 'path'>>

  export type JsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type MasterProfileCountOrderByAggregateInput = {
    id?: SortOrder
    data?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type MasterProfileAvgOrderByAggregateInput = {
    id?: SortOrder
  }

  export type MasterProfileMaxOrderByAggregateInput = {
    id?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type MasterProfileMinOrderByAggregateInput = {
    id?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type MasterProfileSumOrderByAggregateInput = {
    id?: SortOrder
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }
  export type JsonWithAggregatesFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonWithAggregatesFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>

  export type JsonWithAggregatesFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedJsonFilter<$PrismaModel>
    _max?: NestedJsonFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type FloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type CustomQnaMemoryListRelationFilter = {
    every?: CustomQnaMemoryWhereInput
    some?: CustomQnaMemoryWhereInput
    none?: CustomQnaMemoryWhereInput
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type CustomQnaMemoryOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type ApplicationHistoryCountOrderByAggregateInput = {
    id?: SortOrder
    jobUrl?: SortOrder
    atsPlatform?: SortOrder
    jobTitle?: SortOrder
    company?: SortOrder
    matchScore?: SortOrder
    status?: SortOrder
    stepsLog?: SortOrder
    customQuestions?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ApplicationHistoryAvgOrderByAggregateInput = {
    id?: SortOrder
    matchScore?: SortOrder
  }

  export type ApplicationHistoryMaxOrderByAggregateInput = {
    id?: SortOrder
    jobUrl?: SortOrder
    atsPlatform?: SortOrder
    jobTitle?: SortOrder
    company?: SortOrder
    matchScore?: SortOrder
    status?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ApplicationHistoryMinOrderByAggregateInput = {
    id?: SortOrder
    jobUrl?: SortOrder
    atsPlatform?: SortOrder
    jobTitle?: SortOrder
    company?: SortOrder
    matchScore?: SortOrder
    status?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ApplicationHistorySumOrderByAggregateInput = {
    id?: SortOrder
    matchScore?: SortOrder
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type FloatNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedFloatNullableFilter<$PrismaModel>
    _min?: NestedFloatNullableFilter<$PrismaModel>
    _max?: NestedFloatNullableFilter<$PrismaModel>
  }

  export type ApplicationHistoryScalarRelationFilter = {
    is?: ApplicationHistoryWhereInput
    isNot?: ApplicationHistoryWhereInput
  }

  export type CustomQnaMemoryCountOrderByAggregateInput = {
    id?: SortOrder
    questionHash?: SortOrder
    questionText?: SortOrder
    answerText?: SortOrder
    sourceApplicationId?: SortOrder
  }

  export type CustomQnaMemoryAvgOrderByAggregateInput = {
    id?: SortOrder
    sourceApplicationId?: SortOrder
  }

  export type CustomQnaMemoryMaxOrderByAggregateInput = {
    id?: SortOrder
    questionHash?: SortOrder
    questionText?: SortOrder
    answerText?: SortOrder
    sourceApplicationId?: SortOrder
  }

  export type CustomQnaMemoryMinOrderByAggregateInput = {
    id?: SortOrder
    questionHash?: SortOrder
    questionText?: SortOrder
    answerText?: SortOrder
    sourceApplicationId?: SortOrder
  }

  export type CustomQnaMemorySumOrderByAggregateInput = {
    id?: SortOrder
    sourceApplicationId?: SortOrder
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type CustomQnaMemoryCreateNestedManyWithoutSourceApplicationInput = {
    create?: XOR<CustomQnaMemoryCreateWithoutSourceApplicationInput, CustomQnaMemoryUncheckedCreateWithoutSourceApplicationInput> | CustomQnaMemoryCreateWithoutSourceApplicationInput[] | CustomQnaMemoryUncheckedCreateWithoutSourceApplicationInput[]
    connectOrCreate?: CustomQnaMemoryCreateOrConnectWithoutSourceApplicationInput | CustomQnaMemoryCreateOrConnectWithoutSourceApplicationInput[]
    createMany?: CustomQnaMemoryCreateManySourceApplicationInputEnvelope
    connect?: CustomQnaMemoryWhereUniqueInput | CustomQnaMemoryWhereUniqueInput[]
  }

  export type CustomQnaMemoryUncheckedCreateNestedManyWithoutSourceApplicationInput = {
    create?: XOR<CustomQnaMemoryCreateWithoutSourceApplicationInput, CustomQnaMemoryUncheckedCreateWithoutSourceApplicationInput> | CustomQnaMemoryCreateWithoutSourceApplicationInput[] | CustomQnaMemoryUncheckedCreateWithoutSourceApplicationInput[]
    connectOrCreate?: CustomQnaMemoryCreateOrConnectWithoutSourceApplicationInput | CustomQnaMemoryCreateOrConnectWithoutSourceApplicationInput[]
    createMany?: CustomQnaMemoryCreateManySourceApplicationInputEnvelope
    connect?: CustomQnaMemoryWhereUniqueInput | CustomQnaMemoryWhereUniqueInput[]
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type NullableFloatFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type CustomQnaMemoryUpdateManyWithoutSourceApplicationNestedInput = {
    create?: XOR<CustomQnaMemoryCreateWithoutSourceApplicationInput, CustomQnaMemoryUncheckedCreateWithoutSourceApplicationInput> | CustomQnaMemoryCreateWithoutSourceApplicationInput[] | CustomQnaMemoryUncheckedCreateWithoutSourceApplicationInput[]
    connectOrCreate?: CustomQnaMemoryCreateOrConnectWithoutSourceApplicationInput | CustomQnaMemoryCreateOrConnectWithoutSourceApplicationInput[]
    upsert?: CustomQnaMemoryUpsertWithWhereUniqueWithoutSourceApplicationInput | CustomQnaMemoryUpsertWithWhereUniqueWithoutSourceApplicationInput[]
    createMany?: CustomQnaMemoryCreateManySourceApplicationInputEnvelope
    set?: CustomQnaMemoryWhereUniqueInput | CustomQnaMemoryWhereUniqueInput[]
    disconnect?: CustomQnaMemoryWhereUniqueInput | CustomQnaMemoryWhereUniqueInput[]
    delete?: CustomQnaMemoryWhereUniqueInput | CustomQnaMemoryWhereUniqueInput[]
    connect?: CustomQnaMemoryWhereUniqueInput | CustomQnaMemoryWhereUniqueInput[]
    update?: CustomQnaMemoryUpdateWithWhereUniqueWithoutSourceApplicationInput | CustomQnaMemoryUpdateWithWhereUniqueWithoutSourceApplicationInput[]
    updateMany?: CustomQnaMemoryUpdateManyWithWhereWithoutSourceApplicationInput | CustomQnaMemoryUpdateManyWithWhereWithoutSourceApplicationInput[]
    deleteMany?: CustomQnaMemoryScalarWhereInput | CustomQnaMemoryScalarWhereInput[]
  }

  export type CustomQnaMemoryUncheckedUpdateManyWithoutSourceApplicationNestedInput = {
    create?: XOR<CustomQnaMemoryCreateWithoutSourceApplicationInput, CustomQnaMemoryUncheckedCreateWithoutSourceApplicationInput> | CustomQnaMemoryCreateWithoutSourceApplicationInput[] | CustomQnaMemoryUncheckedCreateWithoutSourceApplicationInput[]
    connectOrCreate?: CustomQnaMemoryCreateOrConnectWithoutSourceApplicationInput | CustomQnaMemoryCreateOrConnectWithoutSourceApplicationInput[]
    upsert?: CustomQnaMemoryUpsertWithWhereUniqueWithoutSourceApplicationInput | CustomQnaMemoryUpsertWithWhereUniqueWithoutSourceApplicationInput[]
    createMany?: CustomQnaMemoryCreateManySourceApplicationInputEnvelope
    set?: CustomQnaMemoryWhereUniqueInput | CustomQnaMemoryWhereUniqueInput[]
    disconnect?: CustomQnaMemoryWhereUniqueInput | CustomQnaMemoryWhereUniqueInput[]
    delete?: CustomQnaMemoryWhereUniqueInput | CustomQnaMemoryWhereUniqueInput[]
    connect?: CustomQnaMemoryWhereUniqueInput | CustomQnaMemoryWhereUniqueInput[]
    update?: CustomQnaMemoryUpdateWithWhereUniqueWithoutSourceApplicationInput | CustomQnaMemoryUpdateWithWhereUniqueWithoutSourceApplicationInput[]
    updateMany?: CustomQnaMemoryUpdateManyWithWhereWithoutSourceApplicationInput | CustomQnaMemoryUpdateManyWithWhereWithoutSourceApplicationInput[]
    deleteMany?: CustomQnaMemoryScalarWhereInput | CustomQnaMemoryScalarWhereInput[]
  }

  export type ApplicationHistoryCreateNestedOneWithoutQnaMemoriesInput = {
    create?: XOR<ApplicationHistoryCreateWithoutQnaMemoriesInput, ApplicationHistoryUncheckedCreateWithoutQnaMemoriesInput>
    connectOrCreate?: ApplicationHistoryCreateOrConnectWithoutQnaMemoriesInput
    connect?: ApplicationHistoryWhereUniqueInput
  }

  export type ApplicationHistoryUpdateOneRequiredWithoutQnaMemoriesNestedInput = {
    create?: XOR<ApplicationHistoryCreateWithoutQnaMemoriesInput, ApplicationHistoryUncheckedCreateWithoutQnaMemoriesInput>
    connectOrCreate?: ApplicationHistoryCreateOrConnectWithoutQnaMemoriesInput
    upsert?: ApplicationHistoryUpsertWithoutQnaMemoriesInput
    connect?: ApplicationHistoryWhereUniqueInput
    update?: XOR<XOR<ApplicationHistoryUpdateToOneWithWhereWithoutQnaMemoriesInput, ApplicationHistoryUpdateWithoutQnaMemoriesInput>, ApplicationHistoryUncheckedUpdateWithoutQnaMemoriesInput>
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }
  export type NestedJsonFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<NestedJsonFilterBase<$PrismaModel>>, Exclude<keyof Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<NestedJsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>

  export type NestedJsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedFloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedFloatNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedFloatNullableFilter<$PrismaModel>
    _min?: NestedFloatNullableFilter<$PrismaModel>
    _max?: NestedFloatNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type CustomQnaMemoryCreateWithoutSourceApplicationInput = {
    questionHash: string
    questionText: string
    answerText: string
  }

  export type CustomQnaMemoryUncheckedCreateWithoutSourceApplicationInput = {
    id?: number
    questionHash: string
    questionText: string
    answerText: string
  }

  export type CustomQnaMemoryCreateOrConnectWithoutSourceApplicationInput = {
    where: CustomQnaMemoryWhereUniqueInput
    create: XOR<CustomQnaMemoryCreateWithoutSourceApplicationInput, CustomQnaMemoryUncheckedCreateWithoutSourceApplicationInput>
  }

  export type CustomQnaMemoryCreateManySourceApplicationInputEnvelope = {
    data: CustomQnaMemoryCreateManySourceApplicationInput | CustomQnaMemoryCreateManySourceApplicationInput[]
    skipDuplicates?: boolean
  }

  export type CustomQnaMemoryUpsertWithWhereUniqueWithoutSourceApplicationInput = {
    where: CustomQnaMemoryWhereUniqueInput
    update: XOR<CustomQnaMemoryUpdateWithoutSourceApplicationInput, CustomQnaMemoryUncheckedUpdateWithoutSourceApplicationInput>
    create: XOR<CustomQnaMemoryCreateWithoutSourceApplicationInput, CustomQnaMemoryUncheckedCreateWithoutSourceApplicationInput>
  }

  export type CustomQnaMemoryUpdateWithWhereUniqueWithoutSourceApplicationInput = {
    where: CustomQnaMemoryWhereUniqueInput
    data: XOR<CustomQnaMemoryUpdateWithoutSourceApplicationInput, CustomQnaMemoryUncheckedUpdateWithoutSourceApplicationInput>
  }

  export type CustomQnaMemoryUpdateManyWithWhereWithoutSourceApplicationInput = {
    where: CustomQnaMemoryScalarWhereInput
    data: XOR<CustomQnaMemoryUpdateManyMutationInput, CustomQnaMemoryUncheckedUpdateManyWithoutSourceApplicationInput>
  }

  export type CustomQnaMemoryScalarWhereInput = {
    AND?: CustomQnaMemoryScalarWhereInput | CustomQnaMemoryScalarWhereInput[]
    OR?: CustomQnaMemoryScalarWhereInput[]
    NOT?: CustomQnaMemoryScalarWhereInput | CustomQnaMemoryScalarWhereInput[]
    id?: IntFilter<"CustomQnaMemory"> | number
    questionHash?: StringFilter<"CustomQnaMemory"> | string
    questionText?: StringFilter<"CustomQnaMemory"> | string
    answerText?: StringFilter<"CustomQnaMemory"> | string
    sourceApplicationId?: IntFilter<"CustomQnaMemory"> | number
  }

  export type ApplicationHistoryCreateWithoutQnaMemoriesInput = {
    jobUrl: string
    atsPlatform: string
    jobTitle: string
    company: string
    matchScore?: number | null
    status?: string
    stepsLog?: JsonNullValueInput | InputJsonValue
    customQuestions?: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ApplicationHistoryUncheckedCreateWithoutQnaMemoriesInput = {
    id?: number
    jobUrl: string
    atsPlatform: string
    jobTitle: string
    company: string
    matchScore?: number | null
    status?: string
    stepsLog?: JsonNullValueInput | InputJsonValue
    customQuestions?: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ApplicationHistoryCreateOrConnectWithoutQnaMemoriesInput = {
    where: ApplicationHistoryWhereUniqueInput
    create: XOR<ApplicationHistoryCreateWithoutQnaMemoriesInput, ApplicationHistoryUncheckedCreateWithoutQnaMemoriesInput>
  }

  export type ApplicationHistoryUpsertWithoutQnaMemoriesInput = {
    update: XOR<ApplicationHistoryUpdateWithoutQnaMemoriesInput, ApplicationHistoryUncheckedUpdateWithoutQnaMemoriesInput>
    create: XOR<ApplicationHistoryCreateWithoutQnaMemoriesInput, ApplicationHistoryUncheckedCreateWithoutQnaMemoriesInput>
    where?: ApplicationHistoryWhereInput
  }

  export type ApplicationHistoryUpdateToOneWithWhereWithoutQnaMemoriesInput = {
    where?: ApplicationHistoryWhereInput
    data: XOR<ApplicationHistoryUpdateWithoutQnaMemoriesInput, ApplicationHistoryUncheckedUpdateWithoutQnaMemoriesInput>
  }

  export type ApplicationHistoryUpdateWithoutQnaMemoriesInput = {
    jobUrl?: StringFieldUpdateOperationsInput | string
    atsPlatform?: StringFieldUpdateOperationsInput | string
    jobTitle?: StringFieldUpdateOperationsInput | string
    company?: StringFieldUpdateOperationsInput | string
    matchScore?: NullableFloatFieldUpdateOperationsInput | number | null
    status?: StringFieldUpdateOperationsInput | string
    stepsLog?: JsonNullValueInput | InputJsonValue
    customQuestions?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ApplicationHistoryUncheckedUpdateWithoutQnaMemoriesInput = {
    id?: IntFieldUpdateOperationsInput | number
    jobUrl?: StringFieldUpdateOperationsInput | string
    atsPlatform?: StringFieldUpdateOperationsInput | string
    jobTitle?: StringFieldUpdateOperationsInput | string
    company?: StringFieldUpdateOperationsInput | string
    matchScore?: NullableFloatFieldUpdateOperationsInput | number | null
    status?: StringFieldUpdateOperationsInput | string
    stepsLog?: JsonNullValueInput | InputJsonValue
    customQuestions?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CustomQnaMemoryCreateManySourceApplicationInput = {
    id?: number
    questionHash: string
    questionText: string
    answerText: string
  }

  export type CustomQnaMemoryUpdateWithoutSourceApplicationInput = {
    questionHash?: StringFieldUpdateOperationsInput | string
    questionText?: StringFieldUpdateOperationsInput | string
    answerText?: StringFieldUpdateOperationsInput | string
  }

  export type CustomQnaMemoryUncheckedUpdateWithoutSourceApplicationInput = {
    id?: IntFieldUpdateOperationsInput | number
    questionHash?: StringFieldUpdateOperationsInput | string
    questionText?: StringFieldUpdateOperationsInput | string
    answerText?: StringFieldUpdateOperationsInput | string
  }

  export type CustomQnaMemoryUncheckedUpdateManyWithoutSourceApplicationInput = {
    id?: IntFieldUpdateOperationsInput | number
    questionHash?: StringFieldUpdateOperationsInput | string
    questionText?: StringFieldUpdateOperationsInput | string
    answerText?: StringFieldUpdateOperationsInput | string
  }



  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}