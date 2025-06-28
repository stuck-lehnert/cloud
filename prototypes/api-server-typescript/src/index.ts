import {Pool} from 'pg';
import { $resourceManager } from './framework';
import { z } from 'zod';
import path from 'path';
import { $migrate } from './framework/migrations';

const pool = new Pool({
    host: 'localhost',
    user: 'postgres',
    database: 'asdf',
});

await $migrate({ pool, directory: path.join(__dirname, '..', 'migrations') });

const mgr = $resourceManager(pool);

const idField = () => ({
    id: {
        type: z.string(),
        sqlColumn: 'id',
    },
});

const timestampFields = () => ({
    createdAt: {
        type: z.coerce.date(),
        sqlColumn: 'created_at',
    },
    modifiedAt: {
        type: z.coerce.date(),
        sqlColumn: 'modified_at',
    },
});

const locFields = () => ({
    locCountry: {
        type: z.string().nullable(),
        sqlColumn: 'loc_country',
    },
    locCity: {
        type: z.string().nullable(),
        sqlColumn: 'loc_city',
    },
    locZip: {
        type: z.string().nullable(),
        sqlColumn: 'loc_zip',
    },
    locStreetAddress: {
        type: z.string().nullable(),
        sqlColumn: 'loc_street_address',
    },
});

const User = mgr.$sqlResource({
    sqlTable: 'users',
    pkeyAttributes: ['id'],
    modifiableAttributes: ['salutation', 'firstName', 'lastName', 'username'],
    attributes: {
        ...idField(),
        salutation: {
            type: z.string().nullable(),
            sqlColumn: 'salutation',
        },
        firstName: {
            type: z.string(),
            sqlColumn: 'first_name',
        },
        lastName: {
            type: z.string().nullable(),
            sqlColumn: 'last_name',
        },
        username: {
            type: z.string().nullable(),
            sqlColumn: 'username',
        },
        ...timestampFields(),
    },
    orderBy: { sqlColumn: '_sort', order: 'asc' },
});

const UserSession = mgr.$sqlResource({
    sqlTable: 'user_sessions',
    pkeyAttributes: ['id'],
    attributes: {
        ...idField(),
        userId: {
            type: z.string(),
            sqlColumn: 'user_id',
        },
        inetAddr: {
            type: z.string().nullable(),
            sqlColumn: 'inet_addr',
        },
        userAgent: {
            type: z.string().nullable(),
            sqlColumn: 'user_agent',
        },
        createdAt: {
            type: z.coerce.date(),
            sqlColumn: 'created_at',
        },
        expiresAt: {
            type: z.coerce.date(),
            sqlColumn: 'expires_at',
        },
    },
});

const Group = mgr.$sqlResource({
    sqlTable: 'groups',
    pkeyAttributes: ['id'],
    modifiableAttributes: ['name', 'description'],
    attributes: {
        ...idField(),
        name: {
            sqlColumn: 'name',
            type: z.string(),
        },
        description: {
            sqlColumn: 'description',
            type: z.string().nullable(),
        },
        ...timestampFields(),
    },
    orderBy: { sqlColumn: '_sort', order: 'asc' },
});

const Customer = mgr.$sqlResource({
    sqlTable: 'customers',
    pkeyAttributes: ['id'],
    modifiableAttributes: ['salutation', 'name', 'locCountry', 'locCity', 'locZip', 'locStreetAddress'],
    attributes: {
        ...idField(),
        salutation: {
            type: z.string().nullable(),
            sqlColumn: 'salutation',
        },
        name: {
            sqlColumn: 'name',
            type: z.string(),
        },
        ...locFields(),
        ...timestampFields(),
    },
    orderBy: { sqlColumn: '_sort', order: 'asc' },
});

const Project = mgr.$sqlResource({
    sqlTable: 'projects',
    pkeyAttributes: ['id'],
    modifiableAttributes: ['title', 'description', 'locCountry', 'locCity', 'locZip', 'locStreetAddress'],
    attributes: {
        ...idField(),
        title: {
            type: z.string(),
            sqlColumn: 'title',
        },
        description: {
            sqlColumn: 'description',
            type: z.string().nullable(),
        },
        ...locFields(),
        ...timestampFields(),
    },
    orderBy: { sqlColumn: '_sort', order: 'asc' },
});

const Tool = mgr.$sqlResource({
    sqlTable: 'tools',
    pkeyAttributes: ['id'],
    createOnlyAttributes: ['customId'],
    modifiableAttributes: ['brand', 'category', 'label'],
    attributes: {
        ...idField(),
        customId: {
            type: z.number().int(),
            sqlColumn: 'custom_id',
        },
        brand: {
            type: z.string(),
            sqlColumn: 'brand',
        },
        category: {
            type: z.string(),
            sqlColumn: 'category',
        },
        label: {
            type: z.string().nullable(),
            sqlColumn: 'label',
        },
        ...timestampFields(),
    },
    orderBy: { sqlColumn: '_sort', order: 'asc' },
});

const ToolTracking = mgr.$sqlResource({
    sqlTable: 'tool_trackings',
    pkeyAttributes: ['id'],
    createOnlyAttributes: ['toolId', 'projectId', 'responsibleId', 'comment'],
    modifiableAttributes: ['deadlineAt'],
    attributes: {
        ...idField(),
        comment: {
            type: z.string().nullable(),
            sqlColumn: 'comment',
        },
        toolId: {
            type: z.string(),
            sqlColumn: 'tool_id',
        },
        projectId: {
            type: z.string().nullable(),
            sqlColumn: 'project_id',
        },
        responsibleId: {
            type: z.string().nullable(),
            sqlColumn: 'responsible_id',
        },
        startedByUserId: {
            type: z.string().nullable(),
            sqlColumn: 'started_by_user_id',
        },
        endedByUserId: {
            type: z.string().nullable(),
            sqlColumn: 'ended_by_user_id',
        },
        startedAt: {
            type: z.coerce.date(),
            sqlColumn: 'started_at',
        },
        endedAt: {
            type: z.coerce.date().nullable(),
            sqlColumn: 'started_at',
        },
        deadlineAt: {
            type: z.coerce.date().nullable(),
            sqlColumn: 'started_at',
        },
    },
    orderBy: { sqlColumn: '_sort', order: 'asc' },
});

const ToolInventory = mgr.$sqlResource({
    sqlTable: 'tool_inventories',
    pkeyAttributes: ['id'],
    createOnlyAttributes: ['toolId', 'comment'],
    attributes: {
        ...idField(),
        toolId: {
            type: z.string(),
            sqlColumn: 'tool_id',
        },
        comment: {
            type: z.string().nullable(),
            sqlColumn: 'comment',
        },
        createdAt: {
            type: z.coerce.date(),
            sqlColumn: 'created_at',
        },
    },
});

// const Product = mgr.$sqlResource({
//     sqlTable: 'products',
//     pkeyAttributes: ['id'],
//     createOnlyAttributes: ['toolId', 'comment'],
//     attributes: {
//         ...idField(),
//         toolId: {
//             type: z.string(),
//             sqlColumn: 'tool_id',
//         },
//         comment: {
//             type: z.string().nullable(),
//             sqlColumn: 'comment',
//         },
//         createdAt: {
//             type: z.coerce.date(),
//             sqlColumn: 'created_at',
//         },
//     },
// });

console.log(await UserSession.ctx({}).findMany());
