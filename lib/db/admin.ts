import { neon, NeonQueryFunction } from '@neondatabase/serverless';

/**
 * Creates a database client for server-side admin operations
 * Use this in API routes and server components where you need
 * privileged database access
 */
export const createDbClient = (): NeonQueryFunction<false, false> => {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  return neon(databaseUrl);
};

/**
 * Execute a typed SQL query for admin operations
 * @example
 * const db = createDbClient();
 * const users = await adminQuery<User>(db)`SELECT * FROM profiles`;
 */
export function adminQuery<T>(sql: NeonQueryFunction<false, false>) {
  return async (
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T[]> => {
    return sql(strings, ...values) as Promise<T[]>;
  };
}
