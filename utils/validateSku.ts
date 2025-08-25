/**
 * Validador de SKUs conforme al estándar definido en ops/semana0/sku_standard.md
 *
 * Reglas principales:
 * - Solo minúsculas, números y guiones.
 * - Debe terminar en -vXXX (3 dígitos).
 * - Longitud máxima sugerida: 60 caracteres.
 */

export function validateSku(sku: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Longitud máxima
  if (sku.length > 60) {
    errors.push("SKU demasiado largo (>60 caracteres).");
  }

  // Regex principal
  const regex = /^[a-z0-9-]+-v\d{3}$/;
  if (!regex.test(sku)) {
    errors.push("Formato inválido. Debe terminar en -vXXX con 3 dígitos y usar solo minúsculas/números/guiones.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Ejemplo de uso
// console.log(validateSku("course-rh-fin-basico-v001"));
// => { valid: true, errors: [] }
