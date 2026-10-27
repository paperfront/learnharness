import { validateConnectionConfig, type ConnectionConfig } from './api-client';
export interface ConnectionStorage {
 read(): Promise<ConnectionConfig | null>;
 save(config: ConnectionConfig): Promise<void>;
 clear(): Promise<void>;
}
export interface ConnectionRecordStore {
 get(): Promise<unknown>;
 set(value: string): Promise<void>;
 remove(): Promise<void>;
}
/** Keep URL and token in one record so a server switch cannot pair mismatched credentials. */
export function createConnectionStorage(store: ConnectionRecordStore): ConnectionStorage {
 return {
  async read() {
   const raw = await store.get();
   if (raw === null) return null;
   if (typeof raw !== 'string') throw new Error('Invalid saved connection');
   const data: unknown = JSON.parse(raw);
   if (!data || typeof data !== 'object' || !('version' in data) || data.version !== 1 || !('serverUrl' in data) || typeof data.serverUrl !== 'string' || !('token' in data) || typeof data.token !== 'string') throw new Error('Invalid saved connection');
   return validateConnectionConfig({serverUrl:data.serverUrl,token:data.token});
  },
  async save(config) { await store.set(JSON.stringify({version:1,...validateConnectionConfig(config)})); },
  async clear() { await store.remove(); },
 };
}
