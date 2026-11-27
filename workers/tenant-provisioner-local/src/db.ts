/**
 * Zerocraft Platform - Tenant Provisioner Worker (Local)
 * PostgreSQL client helper.
 *
 * Connects directly to the platform database using the service role key.
 * All queries are parameterized to prevent SQL injection.
 * Sensitive values are never logged.
 */

import { Pool, PoolClient, QueryResult } from "pg";
import { redactSecret } from "./config";
import { redactSecrets } from "./redaction";

export interface PlatformDbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export class PlatformDb {
  private pool: Pool;

  constructor(config: PlatformDbConfig) {
    this.pool = new Pool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    this.pool.on("error", (err) => {
      console.error(
        "Unexpected database pool error:",
        redactSecrets(err.message)
      );
    });
  }

  async query<T = unknown>(
    text: string,
    params?: unknown[]
  ): Promise<any> {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      if (process.env.LOG_LEVEL === "debug") {
        // Never log parameter values: they may contain tenant secrets.
        console.debug(
          `DB query: ${text.slice(0, 100)}... params=${params?.length ?? 0} duration=${duration}ms`
        );
      }
      return result;
    } catch (error) {
      const err = error as Error & { code?: string; detail?: string; hint?: string };
      console.error(
        `DB query failed: ${redactSecrets(err.message)} code=${err.code} detail=${redactSecrets(err.detail ?? "")} hint=${redactSecrets(err.hint ?? "")}`
      );
      throw error;
    }
  }

  async queryOne<T = unknown>(
    text: string,
    params?: unknown[]
  ): Promise<T | null> {
    const result = await this.query<T>(text, params);
    return result.rows[0] ?? null;
  }

  async transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await fn(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
