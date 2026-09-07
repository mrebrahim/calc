import * as Crypto from 'expo-crypto';

/** Client-generated UUIDs let a row exist offline and sync idempotently. */
export function newId(): string {
  return Crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}
