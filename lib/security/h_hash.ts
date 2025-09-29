// lib/security/h_hash.ts

/**
 * Helpers de hashing para normalizar PII antes de logs o rate-limit
 * - Implementación base: SHA-256 → hex string
 * - Centralizado para consistencia en todo el proyecto
 */

import { createHash } from 'crypto';

export function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

