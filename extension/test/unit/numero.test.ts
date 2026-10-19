import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import { leerNumero, zonaCupon } from "../../src/numero";

function cargarPagina(nombre: string): void {
  const html = readFileSync(`test/fixtures/${nombre}.html`, "utf8");
  document.documentElement.innerHTML = new DOMParser().parseFromString(
    html,
    "text/html",
  ).documentElement.innerHTML;
}

/** Simula a la web: al elegir un dígito sustituye el span correspondiente. */
function elegirDigitos(digitos: string): void {
  const spans = document.querySelectorAll(".buscacupon-ticket__numero span");
  digitos.split("").forEach((digito, i) => {
    const nuevo = document.createElement("span");
    nuevo.setAttribute("aria-hidden", "true");
    nuevo.textContent = digito;
    spans[i]?.replaceWith(nuevo);
  });
}

describe.each(["cupon-diario", "cuponazo", "sueldazo-fin-de-semana"])("página %s", (pagina) => {
  beforeEach(() => cargarPagina(pagina));

  it("encuentra la zona del cupón", () => {
    const zona = zonaCupon(document);
    expect(zona?.numero.className).toBe("buscacupon-ticket__numero");
    expect(zona?.ticket.className).toBe("buscacupon-ticket");
  });

  it("no hay número mientras el cupón está vacío", () => {
    expect(leerNumero(document)).toBeNull();
  });

  it("lee el número cuando están los cinco dígitos", () => {
    elegirDigitos("07943");
    expect(leerNumero(document)).toBe("07943");
  });

  it("no hay número si falta algún dígito", () => {
    elegirDigitos("794");
    expect(leerNumero(document)).toBeNull();
  });
});

describe("leerNumero en otros casos", () => {
  it("usa #numero si la web lo rellena (página con sesión)", () => {
    document.body.innerHTML = `<div class="buscacupon-ticket"><div class="buscacupon-ticket__numero">
      <input id="numero" type="hidden" value="16056"></div></div>`;
    expect(leerNumero(document)).toBe("16056");
  });

  it("devuelve null en una página sin cupón", () => {
    document.body.innerHTML = "<main>Eurojackpot</main>";
    expect(zonaCupon(document)).toBeNull();
    expect(leerNumero(document)).toBeNull();
  });
});
