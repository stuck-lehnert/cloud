import { assert } from "./assert";

function assertName(name?: string | null) {
    if (typeof name === 'string') {
        assert(/^[a-zA-Z0-9_]+$/.test(name), 'invalid sql identifier');
    }
}

export function $sql(sql: string, ...args: any[]): SQL {
    return [sql, args];
}

export function $select(table: string, alias?: string) {
    assertName(table);
    assertName(alias);
    
    const reference = () => alias ?? table;

    const { _columns, column, columns, renderColumns } = useColumns(reference);
    const { _whereClauses, where, whereValues, renderWhere } = useWhere(reference);
    const { _limit, limit } = useLimit();
    const { _offset, offset } = useOffset();
    const { _orderBy, orderBy } = useOrderBy(reference);

    const build = (): SQL => {
        const columns = _columns();
        const whereClauses = _whereClauses();
        const orderBy = _orderBy();
        const limit = _limit();
        const offset = _offset();

        assert(columns.length);

        let sql = 'SELECT ';
        const args: any[] = [];

        const columnsSQL = renderColumns()!;
        sql += columnsSQL[0];
        args.push(...columnsSQL[1]);

        sql += ` FROM "${table}" AS "${reference()}"`

        const whereSQL = renderWhere();
        if (whereSQL) {
            sql += ' ' + whereSQL[0];
            args.push(...whereSQL[1]);
        }

        if (orderBy.length) {
            sql += ' ORDER BY ';
            sql += orderBy.map(([sql, order]) => `${sql[0]} ${order}`).join(', ');
            orderBy.forEach(([sql]) => args.push(...sql[1]));
        }

        if (limit) {
            sql += ` LIMIT ${limit[0]}`;
            args.push(...limit[1]);
        }

        if (offset) {
            sql += ` OFFSET ${offset[1]}`;
            args.push(...offset[1]);
        }

        sql += ';';

        return [unwrapArgs(sql), args];
    };

    return {
        reference,
        column,
        columns,
        where,
        whereValues,
        orderBy,
        limit,
        offset,
        build,
    };
}

export function $insert(table: string) {
    assertName(table);

    const reference = () => table;

    const { _columns, column, columns, renderColumns } = useColumns(reference);
    const { _rows, insert } = useInsert();

    const build = (): SQL => {
        const rows = _rows();
        const columns = _columns();
        
        assert(rows.length);

        const args: any[] = [];
        let sql = `INSERT INTO "${reference()}"`;

        let columnNames: string[] = [];
        for (const row of rows) {
            columnNames.push(...Object.keys(row));
        }
        columnNames = [...new Set(columnNames)];

        assert(columnNames.length);

        sql += ' (' + columnNames.map(c => `"${c}"`).join(', ') + ') VALUES ';

        sql += rows.map(row => {
            let sql = '(';
            for (const column of columnNames) {
                if (!(column in row)) {
                    sql += 'DEFAULT, ';
                    continue;
                }

                sql += '??, ';
                args.push(row[column]);
            }

            return sql.substring(0, sql.length - 2) + ')';
        }).join(', ');

        const columnsSQL = renderColumns();
        if (columnsSQL) {
            sql += ' RETURNING ' + columnsSQL[0];
            args.push(...columnsSQL[1]);
        }

        sql += ';';

        return [unwrapArgs(sql), args];
    };

    return {
        reference,
        column,
        columns,
        insert,
        build,
    };
}

export function $update(table: string) {
    assertName(table);

    const reference = () => table;

    const { _values, update } = useUpdate();
    const { _whereClauses, where, whereValues, renderWhere } = useWhere(reference);
    const { _columns, column, columns, renderColumns } = useColumns(reference);

    const build = (): SQL => {
        const values = _values();
        const whereClauses = _whereClauses();
        const columns = _columns();

        assert(Object.keys(values).length);

        const args: any[] = [];
        let sql = `UPDATE "${table}" SET `;

        Object.entries(values).forEach(([key, value]) => {
            sql += `"${key}" = ${value[0]}, `;
            args.push(...value[1]);
        });

        sql = sql.substring(0, sql.length - 2); // remove trailing ', '

        const whereSQL = renderWhere();
        if (whereSQL) {
            sql += ' ' + whereSQL[0];
            args.push(...whereSQL[1]);
        }

        const columnsSQL = renderColumns();
        if (columnsSQL) {
            sql += ' RETURNING ' + columnsSQL[0];
            args.push(...columnsSQL[1]);
        }

        sql += ';';

        return [unwrapArgs(sql), args];
    };

    return {
        reference,
        update,
        where,
        whereValues,
        column,
        columns,
        build,
    };
}

export function $delete(table: string) {
    assertName(table);

    const reference = () => table;

    const { _whereClauses, where, whereValues, renderWhere } = useWhere(reference);
    const { _columns, column, columns, renderColumns } = useColumns(reference);

    const build = (): SQL => {
        const whereClauses = _whereClauses();
        assert(whereClauses.length);

        const args: any[] = [];
        let sql = `DELETE FROM "${reference()}"`;

        const whereSQL = renderWhere()!;
        sql += ' ' + whereSQL[0];
        args.push(...whereSQL[1]);

        const columnsSQL = renderColumns();
        if (columnsSQL) {
            sql += ' RETURNING ' + columnsSQL[0];
            args.push(...columnsSQL[1]);
        }

        sql += ';';

        return [unwrapArgs(sql), args];
    };

    return {
        where,
        whereValues,
        column,
        columns,
        build,
    }
}

function unwrapArgs(sql: string): string {
    let counter = 1;
    return sql.replace(/\?\?/g, () => `\$${counter++}`);
}

function useColumns(reference: () => string) {
    const _columns: SQL[] = [];

    function column(column: string, alias?: string): void;
    function column(column: SQL, alias: string): void;
    function column(column: string | SQL, alias?: string) {
        assert(typeof column === 'string' || isSQL(column));
        if (typeof column !== 'string') assert(!!alias);

        columns({
            [(alias ?? column) as string]: column,
        });
    }

    function columns(columns: Record<string, SQL | string>) {
        for (const [alias, column] of Object.entries(columns)) {
            assert(typeof column === 'string' || isSQL(column));
            assert(/^[a-zA-Z0-9_]+$/.test(alias));

            if (typeof column === 'string') {
                assert(/^[a-zA-Z0-9_]+$/.test(column));

                _columns.push([`"${reference()}"."${column}" AS "${alias}"`, []]);
                continue;
            }

            _columns.push([`${column[0]} AS "${alias}"`, [...column[1]]]);
        }
    }

    function renderColumns(): SQL | null {
        if (!_columns.length) return null;

        const args: any[] = [];
        const sql = _columns.map(c => c[0]).join(', ');
        _columns.forEach(c => args.push(...c[1]));
        return [sql, args];
    }

    return {
        _columns: () => _columns,
        column,
        columns,
        renderColumns,
    };
}

function useWhere(reference: () => string) {
    const _whereClauses: SQL[] = [];

    function whereValues(values: Record<string, any>): void {
        assert(typeof values === 'object');

        for (const [key, value] of Object.entries(values)) {
            assert(/^[a-zA-Z0-9_]+$/.test(key));
            where(`"${reference()}"."${key}" = ??`, value);
        }
    }

    function where(sql: string, ...args: any[]): void {
        assert(typeof sql === 'string');
        _whereClauses.push([sql, args]);
    }

    function renderWhere(): SQL | null {
        if (!_whereClauses.length) return null;

        const args: any[] = [];
        let sql = 'WHERE ';
        sql += _whereClauses.map(c => `(${c[0]})`).join(' AND ');
        _whereClauses.forEach(c => args.push(...c[1]));
        return [sql, args];
    }

    return {
        _whereClauses: () => _whereClauses,
        whereValues,
        where,
        renderWhere,
    };
}

function useOrderBy(reference: () => string) {
    const _orderBy: [SQL, 'asc' | 'desc'][] = [];

    function orderBy(order: 'asc' | 'desc', column: string): void;
    function orderBy(order: 'asc' | 'desc', sql: SQL): void;
    function orderBy(order: 'asc' | 'desc', sqlOrColumn: string | SQL): void {
        assert(order === 'asc' || order === 'desc');
        assert(typeof sqlOrColumn === 'string' || isSQL(sqlOrColumn));

        if (typeof sqlOrColumn === 'string') {
            _orderBy.push([[`"${reference()}"."${sqlOrColumn}"`, []], order]);
            return;
        }

        _orderBy.push([sqlOrColumn, order]);
    }

    return {
        _orderBy: () => _orderBy,
        orderBy,
    }
}

function useLimit() {
    let _limit: SQL | null = null;

    function limit(sql: string, ...args: any[]): void {
        assert(typeof sql === 'string');
        _limit = [sql, args];
    }

    return {
        _limit: () => _limit,
        limit,
    };
}

function useOffset() {
    let _offset: SQL | null = null;

    function offset(sql: string, ...args: any[]): void {
        assert(typeof sql === 'string');
        _offset = [sql, args];
    }

    return {
        _offset: () => _offset,
        offset,
    };
}

function useInsert() {
    const _rows: Record<string, any>[] = [];

    function insert(row: Record<string, any>): void;
    function insert(rows: Record<string, any>[]): void;
    function insert(rowOrRows: Record<string, any> | Record<string, any>[]): void {
        assert(Array.isArray(rowOrRows) || typeof rowOrRows === 'object');

        if (!Array.isArray(rowOrRows)) {
            _rows.push(rowOrRows);
            return;
        }

        _rows.push(...rowOrRows);
    }

    return {
        _rows: () => _rows,
        insert,
    };
}

function useUpdate() {
    const _values: Record<string, SQL> = {};

    function update(key: string, value: SQL): void;
    function update(key: string, value: any): void;
    function update(values: Record<string, SQL | any>): void;
    function update(keyOrValues: any, extra?: any) {
        if (typeof keyOrValues === 'string') {
            const key = keyOrValues;
            assertName(key);

            if (isSQL(extra)) {
                _values[key] = extra as SQL;
                return;
            }
            
            _values[key] = ['??', [extra]];
            return;
        }

        assert(typeof keyOrValues === 'object');
        const values = keyOrValues;

        Object.entries(values).forEach(([key, value]) => {
            assertName(key);

            if (isSQL(value)) {
                _values[key] = value as SQL;
                return;
            }

            _values[key] = ['??', [value]];
        });
    }

    return {
        _values: () => _values,
        update,
    };
}


export type SQL = [string, any[]];

export function isSQL(value: any): boolean {
    if (!Array.isArray(value)) return false;
    if (value.length !== 2) return false;
    if (typeof value.at(0) !== 'string') return false;
    if (!Array.isArray(value.at(1))) return false;

    return true;
}