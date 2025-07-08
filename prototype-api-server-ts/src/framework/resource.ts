import pg from 'pg';
import { $delete, $insert, $select, $sql, $update, type QueryBuilder, type SelectBuilder, type SQL } from './querybuilder';
import { z } from 'zod';
import type PG from 'pg';
import { assert } from './assert';
import { table } from 'console';

export type ResourceManager<ContextT extends Record<string, any>> = ReturnType<typeof $resourceManager<ContextT>>;
export type Resource<ContextT extends Record<string, any>> = ReturnType<ResourceManager<ContextT>['$sqlResource']>;

type ExtractStaticAttributes<AttributesT extends Record<string, AttributeDef<any, z.ZodType>>> = {
    [k in keyof AttributesT as AttributesT[k] extends StaticAttributeDef<z.ZodType> ? k : never]: AttributesT[k];
};

type ExtractDynamicAttributes<AttributesT extends Record<string, AttributeDef<any, z.ZodType>>> = {
    [k in keyof AttributesT as AttributesT[k] extends DynamicAttributeDef<any, z.ZodType> ? k : never]: AttributesT[k];
};

type ExtractResourceAttrs<ResourceT extends Resource<any>> = ReturnType<ReturnType<ResourceT['ctx']>['_$attrs']>;
type ExtractResourceRefs<ResourceT extends Resource<any>> = ReturnType<ReturnType<ResourceT['ctx']>['_$refs']>;
type ExtractResourceRecord<ResourceT extends Resource<any>> = ReturnType<ReturnType<ResourceT['ctx']>['_$record']>;

type AttributeDef<ContextT, ZodT extends z.ZodType> = StaticAttributeDef<ZodT> | DynamicAttributeDef<ContextT, ZodT>;

type StaticAttributeDef<ZodT extends z.ZodType> = {
    type: ZodT;
    sqlColumn: string;
};

type DynamicAttributeDef<ContextT, ZodT extends z.ZodType> = {
    type: ZodT;
    sqlExpr: (table: string, ctx: ContextT) => SQL;
};

type ReferenceDef<
    ContextT extends Record<string, any>,
    ResourceT extends Resource<ContextT>,
> = {
    resource: () => ResourceT;
    join: (lhs: string, rhs: string) => SQL;
    mode?: 'many' | 'not-null';
};

type OrderByDef<ContextT> = {
    order: 'asc' | 'desc';
} & ({
    sqlColumn: string;
} | {
    sqlExpr: (table: string, ctx: ContextT) => SQL;
});

type WhereDef<ContextT> = (table: string, ctx: ContextT) => SQL;

export function $resourceManager<
    ContextT extends Record<string, any>
>(pool: PG.Pool) {
    function $sqlResource<
        AttributesT extends Record<string, AttributeDef<ContextT, z.ZodType>>,
        ReferencesT extends Record<string, ReferenceDef<ContextT, any>> = {},
        UniqueT extends (keyof ExtractStaticAttributes<AttributesT>)[] = [],
        CreateOnlyT extends (keyof ExtractStaticAttributes<AttributesT>)[] = [],
        ModifiableT extends (keyof ExtractStaticAttributes<AttributesT>)[] = [],
    >(_props: {
        sqlTable: string;
        pkeyAttributes: UniqueT;
        createOnlyAttributes?: CreateOnlyT;
        modifiableAttributes?: ModifiableT;
        attributes: AttributesT;
        references?: ReferencesT;
        orderBy?: OrderByDef<ContextT> | OrderByDef<ContextT>[];
        where?: WhereDef<ContextT>;
    }) {
        _props = { ..._props };
        _props.references ??= {} as any;
        
        type StaticAttributes = ExtractStaticAttributes<AttributesT>;
        type DynamicAttributes = ExtractDynamicAttributes<AttributesT>;

        type ResourceRecord = z.output<ZodRecordType>;
        type ZodRecordType = z.ZodObject<{
            [k in keyof AttributesT]: AttributesT[k]['type'];
        }>;

        type UniqueProps = {
            [k in UniqueT[number]]: z.infer<StaticAttributes[k]['type']>;
        };

        type WhereProps = {
            [k in keyof StaticAttributes]?: z.infer<StaticAttributes[k]['type']>;
        };

        type CreateOnlyProps = {
            [k in CreateOnlyT[number]]: z.infer<StaticAttributes[k]['type']>;
        };

        type ModifiableProps = {
            [k in ModifiableT[number]]?: z.infer<StaticAttributes[k]['type']>;
        };

        type RefRecord<name extends keyof ReferencesT> = ExtractResourceRecord<ReturnType<ReferencesT[name]['resource']>>;
        type LoadedRefType<name extends keyof ReferencesT> =
            ReferencesT[name]['mode'] extends 'many'
                ? RefRecord<name>[]
                : ReferencesT[name]['mode'] extends 'not-null'
                    ? RefRecord<name>
                    : RefRecord<name> | null;
        
        type IncludeRefsProps = (keyof ReferencesT)[];
        type WithRefs<IncludedT extends IncludeRefsProps> = ResourceRecord & {
            [k in IncludedT[number]]: LoadedRefType<k>;
        };

        // modifiable props can be set on create
        type CreateProps = CreateOnlyProps & ModifiableProps;

        assert(_props.pkeyAttributes.length, 'at least 1 pkey attr is required');

        assert((_props.createOnlyAttributes ?? []).every(attr => {
            return !_props.modifiableAttributes?.includes(attr);
        }), 'create-only attrs must not be tagged as modifiable');
        
        const recordType = z.object(Object.fromEntries(
            Object.entries(_props.attributes).map(([key, value]) => {
                return [key, value.type];
            }),
        )) as ZodRecordType;

        function ctx(ctx: ContextT) {
            function queryAttributes<
                AttributesT extends Record<string, AttributeDef<ContextT, z.ZodType>>,
            >(query: QueryBuilder, alias: string, attributes: AttributesT, prefix?: string) {
                prefix ??= '';
                
                query.columns(
                    Object.fromEntries(
                        Object.entries(attributes).map(([key, value]: [string, any]) => {
                            key = prefix + key;
                            
                            if (value.sqlColumn) return [key, $sql(`"${alias}"."${value.sqlColumn}"`)];

                            const dynamicDef = value as DynamicAttributeDef<ContextT, any>;
                            const sql = dynamicDef.sqlExpr(`"${alias}"`, ctx);
                            return [key, sql];
                        })
                    ),
                );
                
            }
            function queryColumns(query: QueryBuilder) {
                queryAttributes(query, query.reference(), _props.attributes);
            }

            function joinReferences(query: SelectBuilder, includes: string[]): Record<string, string> {
                const refAliases: Record<string, string> = {};
                for (const refName of includes) {
                    const ref = _props.references![refName];
                    if (!ref) continue;

                    const refResource = ref.resource() as Resource<any>;

                    const alias = Object.keys(refAliases).length.toString();
                    const join = ref.join(`"${query.reference()}"`, `"${alias}"`);
                    query.leftJoin(refResource._sqlTable, alias, join);

                    refAliases[refName] = alias;
                }

                for (const [refName, alias] of Object.entries(refAliases)) {
                    const refResource = _props.references![refName]!.resource() as Resource<any>;
                    queryAttributes(query, alias, refResource._attributes, `__j${alias}_`);
                }

                return refAliases;
            }

            function hasPkey(pkey: string[], row: any) {
                if (typeof row !== 'object') return false;
                
                for (const attr of pkey) {
                    if (row[attr] === null || row[attr] === undefined) return false;
                }

                return true;
            }

            function pkeyEquals(pkey: string[], lhs: any, rhs: any) {
                if (typeof lhs !== 'object' || typeof rhs !== 'object') return false;
                
                for (const attr of pkey) {
                    const lattr = lhs[attr], rattr = rhs[attr];

                    if (typeof lattr !== typeof rattr) return false;

                    if (lattr instanceof Date && rattr instanceof Date) {
                        if (lattr.getTime() !== rattr.getTime()) return false;
                    }

                    if (lattr !== rattr) return false;
                }

                return true;
            }

            function aggregateRows(refAliases: Record<string, string>, rows: any[]): Record<string, any>[] {
                if (!rows.length) return [];
                
                const aggregated: any[] = [];

                let currentAgg: any = null;
                for (const row of rows) {
                    if (currentAgg !== null && !pkeyEquals(_props.pkeyAttributes, currentAgg, row)) {
                        aggregated.push(currentAgg);
                        currentAgg = null;
                    }

                    if (currentAgg === null) currentAgg = row;

                    for (const [refName, alias] of Object.entries(refAliases)) {
                        const resource = _props.references![refName]!.resource() as Resource<ContextT>;
                        
                        if (!Array.isArray(currentAgg[refName])) {
                            currentAgg[refName] = [];
                        }

                        const currentRef: Record<string, any> = {};
                        for (const [key, value] of Object.entries(currentAgg)) {
                            if (!key.startsWith(`__j${alias}_`)) continue;
                            
                            const attrName = key.substring(`__j${alias}_`.length);
                            currentRef[attrName] = value;

                            delete currentAgg[key];
                        }

                        if (hasPkey(resource._pkeyAttributes.includes('')))

                        currentAgg[refName].push
                        
                    }
                    for (const [] of Object.entries(currentAgg)) {
                        for (const [refName])
                    }
                }

                // let currentAgg = rows[0];
                for (const row of rows.slice(1)) {
                    if (!pkeyEquals(_props.pkeyAttributes, currentAgg, row)) {
                        currentAgg = row;
                    }
                }
                
                return aggregated;
            }

            function mapInputData(data: Record<string, any>): Record<string, any> {
                const input = { ...data };
                Object.entries(input).forEach(([key, value]) => {
                    if (typeof value === 'string') {
                        value = value.trim();
                        input[key] = value.length ? value : null;
                    }
                });

                const mapped: Record<string, any> = {};

                Object.entries(data).forEach(([key, value]) => {
                    const column = (_props.attributes[key] as any)?.sqlColumn;
                    if (!column) return;

                    value = _props.attributes[key]!.type.parse(value);
                    mapped[column] = value;
                });

                return mapped;
            }

            return {
                async findUnique<
                    IncludesT extends IncludeRefsProps = [],
                >(
                    props: UniqueProps,
                    opts?: {
                        include?: IncludesT,
                    },
                ): Promise<WithRefs<IncludesT> | null> {
                    opts ??= {};
                    
                    return null;
                },

                async findMany<
                    IncludesT extends IncludeRefsProps = [],
                >(
                    props?: WhereProps,
                    opts?: {
                        limit?: number;
                        offset?: number;
                        include?: IncludesT,
                    },
                ): Promise<WithRefs<IncludesT>[]> {
                    props ??= {};
                    opts ??= {};
                    opts!.include = [...new Set(opts.include ?? [])] as any;

                    const query = $select(_props.sqlTable, 'main');

                    queryColumns(query);

                    const refAliases = joinReferences(query, opts.include as string[]);

                    if (_props.orderBy) {
                        const orderBy = Array.isArray(_props.orderBy) ? _props.orderBy : [_props.orderBy];
                        orderBy.forEach((order) => {
                            if ((order as any).sqlColumn) {
                                query.orderBy(order.order, (order as any).sqlColumn);
                                return;
                            }

                            const sql = (order as any).sqlExpr(query.reference(), ctx);
                            query.orderBy(order.order, sql);
                        });
                    }

                    if (_props.where) {
                        const sql = _props.where(`"${query.reference()}"`, ctx);
                        query.where(...sql);
                    }

                    const mappedProps = mapInputData(props);
                    query.whereValues(mappedProps);

                    if (typeof opts.limit === 'number') {
                        query.limit('??', opts.limit);
                    }

                    if (typeof opts.offset === 'number') {
                        query.offset('??', opts.offset);
                    }

                    const sql = query.build();

                    console.log(sql[0]);
                    const { rows } = await pool.query(...sql);
                    return z.array(recordType).parse(rows) as any;
                },

                create: async (data: CreateProps) => {
                    const query = $insert(_props.sqlTable);
                    
                    const mappedData = mapInputData(data);
                    query.insert(mappedData);

                    queryColumns(query);

                    const sql = query.build();
                    
                    const { rows } = await pool.query(...sql);
                    return recordType.parse(rows[0]);
                },

                modify: async (where: WhereProps, data: ModifiableProps) => {
                    const query = $update(_props.sqlTable);

                    const mappedWhere = mapInputData(where);
                    const mappedData = mapInputData(data);

                    query.update(mappedData);
                    query.whereValues(mappedWhere);
                    
                    queryColumns(query);

                    const sql = query.build();

                    const { rows } = await pool.query(...sql);
                    return z.array(recordType).parse(rows);
                },

                delete: async (where: WhereProps) => {
                    const query = $delete(_props.sqlTable);

                    const mappedWhere = mapInputData(where);
                    query.whereValues(mappedWhere);

                    queryColumns(query);

                    const sql = query.build();

                    console.log(sql[0]);

                    const { rows } = await pool.query(...sql);
                    return z.array(recordType).parse(rows);
                },

                _$record: (): ResourceRecord => {
                    throw new Error('this function should not be called!');
                },

                _$attrs: (): AttributesT => {
                    throw new Error('this function should not be called!');
                },

                _$refs: (): ReferencesT => {
                    throw new Error('this function should not be called!');
                },
            };
        }

        return {
            ctx,
            _sqlTable: _props.sqlTable,
            _pkeyAttributes: _props.pkeyAttributes,
            _attributes: _props.attributes,
            _zodRecordType: recordType,
        };
    }

    return {
        $sqlResource,
    };
}



