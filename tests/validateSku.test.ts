import { validateSku } from "../utils/validateSku";

describe("validateSku", () => {
  it("acepta un SKU válido", () => {
    const result = validateSku("course-rh-fin-basico-v001");
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it("rechaza SKU sin padding en versión", () => {
    const result = validateSku("course-rh-fin-basico-v1");
    expect(result.valid).toBe(false);
  });

  it("rechaza SKU con mayúsculas", () => {
    const result = validateSku("Course-RH-fin-basico-v001");
    expect(result.valid).toBe(false);
  });

  it("rechaza SKU demasiado largo", () => {
    const longSku = "course-" + "x".repeat(55) + "-v001";
    const result = validateSku(longSku);
    expect(result.valid).toBe(false);
  });
});
