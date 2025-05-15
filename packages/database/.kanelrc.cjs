const { makeKyselyHook, kyselyTypeFilter } = require('kanel-kysely');
const { recase } = require('@kristiandupont/recase');
const toPascalCase = recase('snake', 'pascal');

/** @type {import('kanel').Config} */
module.exports = {
  connection: {
    host: process.env.DATABASE_HOST,
    port: process.env.DATABASE_PORT,
    database: process.env.DATABASE_NAME,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
  },
  preDeleteOutputFolder: true,
  enumStyle: "type",
  customTypeMap: {
    'pg_catalog.timestamp': 'string',
    'pg_catalog.timestamptz': 'string',
  },
  typeFilter: kyselyTypeFilter,
  preRenderHooks: [makeKyselyHook()],
  postRenderHooks: [
    (path, lines) => {
      if (path.endsWith("Database.ts")) {
        lines.pop();
        return [...lines, "export type { Database as default };"];
      }
      return lines;
    },
  ],
  generateIdentifierType: (c, d) => {
    const name = toPascalCase(`${d.name}_${c.name}`);

    return {
      declarationType: 'typeDeclaration',
      name,
      exportAs: 'named',
      typeDefinition: [`number`],
    };
  },
};
