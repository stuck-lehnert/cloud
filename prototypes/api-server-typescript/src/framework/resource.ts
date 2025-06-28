import pg from 'pg';
import { $delete, $insert, $select, $sql, $update, type SQL } from './querybuilder';
import { z } from 'zod';
import type PG from 'pg';
import { assert } from './assert';

export type ResourceManager<ContextT extends Record<string, any>> = ReturnType<typeof $resourceManager<ContextT>>;

type ExtractStaticAttributes<AttributesT extends Record<string, AttributeDef<any, z.ZodType>>> = {
    [k in keyof AttributesT as AttributesT[k] extends StaticAttributeDef<z.ZodType> ? k : never]: AttributesT[k];
};

type ExtractDynamicAttributes<AttributesT extends Record<string, AttributeDef<any, z.ZodType>>> = {
    [k in keyof AttributesT as AttributesT[k] extends DynamicAttributeDef<any, z.ZodType> ? k : never]: AttributesT[k];
};

type AttributeDef<ContextT, ZodT extends z.ZodType> = StaticAttributeDef<ZodT> | DynamicAttributeDef<ContextT, ZodT>;

type StaticAttributeDef<ZodT extends z.ZodType> = {
    type: ZodT;
    sqlColumn: string;
};

type DynamicAttributeDef<ContextT, ZodT extends z.ZodType> = {
    type: ZodT;
    sqlExpr: (table: string, ctx: ContextT) => SQL;
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
        UniqueT extends (keyof ExtractStaticAttributes<AttributesT>)[],
        CreateOnlyT extends (keyof ExtractStaticAttributes<AttributesT>)[] = [],
        ModifiableT extends (keyof ExtractStaticAttributes<AttributesT>)[] = [],
    >(_props: {
        sqlTable: string;
        pkeyAttributes: UniqueT;
        createOnlyAttributes?: CreateOnlyT;
        modifiableAttributes?: ModifiableT;
        attributes: AttributesT;
        orderBy?: OrderByDef<ContextT> | OrderByDef<ContextT>[];
        where?: WhereDef<ContextT>;
    }) {
        _props = { ..._props };
        
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

            function queryColumns(query: any) {
                query.columns(
                    Object.fromEntries(
                        Object.entries(_props.attributes).map(([key, value]: [string, any]) => {
                            if (value.sqlColumn) return [key, value.sqlColumn];

                            const dynamicDef = value as DynamicAttributeDef<ContextT, any>;
                            const sql = dynamicDef.sqlExpr(`"${query.reference()}"`, ctx);
                            return [key, sql];
                        })
                    ),
                );
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
                findUnique: async (props: UniqueProps): Promise<ResourceRecord | null> => {
                    return null;
                },

                findMany: async (props?: WhereProps, opts?: {
                    limit?: number;
                    offset?: number;
                }): Promise<ResourceRecord[]> => {
                    props ??= {};
                    opts ??= {};

                    const query = $select(_props.sqlTable, 'main');

                    queryColumns(query);

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
                    
                    const { rows } = await pool.query(...sql);
                    return z.array(recordType).parse(rows);
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
            };
        }

        return {
            ctx,
        };
    }

    return {
        $sqlResource,
    };
}



