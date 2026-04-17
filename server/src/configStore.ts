import type Database from 'better-sqlite3';
import crypto from 'node:crypto';

export interface LLMSettings {
  provider: 'openai' | 'azure';
  apiKey: string;
  baseUrl?: string;
  model?: string;
  endpoint?: string;
  deployment?: string;
  apiVersion?: string;
}

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const DEFAULT_KEY = 'ai-knowledge-explorer-default-key!!'; // 32 bytes

function getEncryptionKey(): Buffer {
  const envKey = process.env.CONFIG_ENCRYPTION_KEY;
  if (envKey) {
    // Pad or hash to 32 bytes
    return crypto.createHash('sha256').update(envKey).digest();
  }
  return Buffer.from(DEFAULT_KEY.slice(0, 32), 'utf-8');
}

export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf-8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Format: base64(iv + authTag + encrypted)
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey();
  const data = Buffer.from(ciphertext, 'base64');
  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted) + decipher.final('utf-8');
}

export function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 8) return '****';
  return apiKey.slice(0, 4) + '****' + apiKey.slice(-4);
}

export class ConfigStore {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  getSettings(): LLMSettings | null {
    const rows = this.db.prepare('SELECT key, value FROM app_config').all() as { key: string; value: string }[];
    if (rows.length === 0) return null;

    const map: Record<string, string> = {};
    for (const row of rows) {
      map[row.key] = row.value;
    }

    const provider = map['provider'];
    const encryptedKey = map['apiKey'];
    if (!provider || !encryptedKey) return null;

    let apiKey: string;
    try {
      apiKey = decrypt(encryptedKey);
    } catch {
      return null;
    }

    return {
      provider: provider as 'openai' | 'azure',
      apiKey,
      baseUrl: map['baseUrl'] || undefined,
      model: map['model'] || undefined,
      endpoint: map['endpoint'] || undefined,
      deployment: map['deployment'] || undefined,
      apiVersion: map['apiVersion'] || undefined,
    };
  }

  saveSettings(settings: LLMSettings): void {
    const upsert = this.db.prepare(
      'INSERT INTO app_config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
    );

    const encryptedKey = encrypt(settings.apiKey);

    const transaction = this.db.transaction(() => {
      upsert.run('provider', settings.provider);
      upsert.run('apiKey', encryptedKey);
      upsert.run('baseUrl', settings.baseUrl || '');
      upsert.run('model', settings.model || '');
      upsert.run('endpoint', settings.endpoint || '');
      upsert.run('deployment', settings.deployment || '');
      upsert.run('apiVersion', settings.apiVersion || '');
    });

    transaction();
  }
}
