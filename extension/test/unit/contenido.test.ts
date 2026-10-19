import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RespuestaConsulta } from "../../../api/src/tipos";
import { iniciar } from "../../src/contenido";

const PAGINA = readFileSync("test/fixtures/cupon-diario.html", "utf8");

function respuesta(numero: string, veces = 0): RespuestaConsulta {
  return {
    numero,
    hayResultados: veces > 0,
    resultados: Array.from({ length: veces }, () => ({
      fecha: "2019-03-01",
      organismo: "ONCE" as const,
      juego: "CUPONAZO" as const,
      juegoNombre: "Cuponazo",
      tipo: "PRINCIPAL" as const,
      tipoNombre: "Premio principal",
      serie: "129",
      sorteo: null,
    })),
  };
}

function elegirDigitos(digitos: string): void {
  const spans = document.querySelectorAll(".buscacupon-ticket__numero span");
  digitos.split("").forEach((digito, i) => {
    const nuevo = document.createElement("span");
    nuevo.textContent = digito;
    spans[i]?.replaceWith(nuevo);
  });
}

function textoIndicador(): string | null | undefined {
  const anfitrion = document.querySelector<HTMLElement>("[data-lotero]");
  if (!anfitrion || anfitrion.hidden) return null;
  return anfitrion.shadowRoot?.querySelector("[role=status]")?.textContent;
}

beforeEach(() => {
  vi.useFakeTimers();
  document.documentElement.innerHTML = new DOMParser().parseFromString(
    PAGINA,
    "text/html",
  ).documentElement.innerHTML;
});

afterEach(() => {
  vi.useRealTimers();
});

describe("iniciar", () => {
  it("coloca el indicador justo después de la imagen del cupón, oculto", () => {
    expect(iniciar(document, vi.fn())).toBe(true);
    const anfitrion = document.querySelector<HTMLElement>("[data-lotero]");
    expect(anfitrion?.previousElementSibling?.className).toBe("buscacupon-ticket");
    expect(anfitrion?.hidden).toBe(true);
  });

  it("no hace nada en una página sin cupón", () => {
    document.body.innerHTML = "<main></main>";
    expect(iniciar(document, vi.fn())).toBe(false);
    expect(document.querySelector("[data-lotero]")).toBeNull();
  });

  it("consulta una sola vez cuando el usuario termina de elegir los dígitos", async () => {
    const consultar = vi.fn(async (n: string) => respuesta(n, 2));
    iniciar(document, consultar, 300);

    for (let i = 1; i <= 5; i++) {
      elegirDigitos("16056".slice(0, i));
      await vi.advanceTimersByTimeAsync(100);
    }
    expect(consultar).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(300);
    expect(consultar).toHaveBeenCalledExactlyOnceWith("16056");
    expect(textoIndicador()).toBe("El 16056 ha salido premiado 2 vecesVer premios");
  });

  it("se oculta si el número queda incompleto", async () => {
    iniciar(document, async (n) => respuesta(n), 0);
    elegirDigitos("16056");
    await vi.advanceTimersByTimeAsync(10);
    expect(textoIndicador()).toBe("El 16056 nunca ha salido premiado");

    elegirDigitos("1605-");
    await vi.advanceTimersByTimeAsync(10);
    expect(textoIndicador()).toBeNull();
  });

  it("ignora la respuesta de un número que ya no está en el cupón", async () => {
    const resolvedores = new Map<string, (r: RespuestaConsulta) => void>();
    const consultar = (n: string) =>
      new Promise<RespuestaConsulta>((resolver) => resolvedores.set(n, resolver));
    iniciar(document, consultar, 0);

    elegirDigitos("11111");
    await vi.advanceTimersByTimeAsync(10);
    elegirDigitos("22222");
    await vi.advanceTimersByTimeAsync(10);

    resolvedores.get("22222")?.(respuesta("22222"));
    resolvedores.get("11111")?.(respuesta("11111", 3));
    await vi.advanceTimersByTimeAsync(10);
    expect(textoIndicador()).toBe("El 22222 nunca ha salido premiado");
  });

  it("muestra el error y permite reintentar", async () => {
    const consultar = vi
      .fn<(n: string) => Promise<RespuestaConsulta>>()
      .mockRejectedValueOnce(new Error("HTTP 503"))
      .mockImplementation(async (n) => respuesta(n, 1));
    iniciar(document, consultar, 0);

    elegirDigitos("16056");
    await vi.advanceTimersByTimeAsync(10);
    expect(textoIndicador()).toBe("No se ha podido comprobar el número.Reintentar");

    const sombra = document.querySelector("[data-lotero]")?.shadowRoot;
    sombra?.querySelector<HTMLButtonElement>(".accion")?.click();
    await vi.advanceTimersByTimeAsync(10);
    expect(textoIndicador()).toBe("El 16056 ha salido premiado 1 vezVer premios");
    expect(consultar).toHaveBeenCalledTimes(2);
  });
});
