import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import * as schema from './schema';

const DB_NAME = 'spendwise.db';

export const expoDb = openDatabaseSync(DB_NAME);
export const db = drizzle(expoDb, { schema });
