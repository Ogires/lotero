import { describe, expect, it } from "vitest";
import { decodificarEntidades, fechaIsoDesdeDmy, numeroCincoCifras } from "../../src/tipos";

describe("numeroCincoCifras", () => {
  it("acepta exactamente cinco dígitos, conservando los ceros a la izquierda", () => {
    expect(numeroCincoCifras("16056")).toBe("16056");
    expect(numeroCincoCifras("05050")).toBe("05050");
    expect(numeroCincoCifras("  52532 ")).toBe("52532");
  });

  it.each(["", "1234", "123456", "12a45", "1 345", "-1234"])("rechaza %j", (valor) => {
    expect(numeroCincoCifras(valor)).toBeNull();
  });
});

describe("fechaIsoDesdeDmy", () => {
  it("extrae la fecha dd/mm/aaaa de un texto y la devuelve en ISO", () => {
    expect(fechaIsoDesdeDmy("Jueves, 15/10/2026")).toBe("2026-10-15");
    expect(fechaIsoDesdeDmy("Domingo, 18/10/2026, Sorteo 1")).toBe("2026-10-18");
  });

  it("rechaza fechas inexistentes o ausentes", () => {
    expect(fechaIsoDesdeDmy("31/02/2026")).toBeNull();
    expect(fechaIsoDesdeDmy("15/13/2026")).toBeNull();
    expect(fechaIsoDesdeDmy("sin fecha")).toBeNull();
  });
});

describe("decodificarEntidades", () => {
  it("decodifica entidades con nombre, decimales y hexadecimales", () => {
    expect(decodificarEntidades("Cup&oacute;n Diario")).toBe("Cupón Diario");
    expect(decodificarEntidades("S&aacute;bado &amp; Mi D&iacute;a")).toBe("Sábado & Mi Día");
    expect(decodificarEntidades("1&#x00ba; Premio &#241;")).toBe("1º Premio ñ");
  });

  it("deja intactas las entidades desconocidas", () => {
    expect(decodificarEntidades("&desconocida; ok")).toBe("&desconocida; ok");
  });
});
