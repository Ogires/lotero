// Content script: muestra bajo el cupón si su número ya ha salido premiado y se
// actualiza cada vez que el usuario cambia un dígito.

import type { Consultar } from "./api";
import { leerNumero, zonaCupon } from "./numero";
import { crearIndicador } from "./vista";

/** Espera tras el último cambio antes de consultar (el usuario cambia dígito a dígito). */
export const ESPERA_MS = 300;

/** Engancha el indicador en la página; devuelve `false` si la página no tiene cupón. */
export function iniciar(doc: Document, consultar: Consultar, esperaMs = ESPERA_MS): boolean {
  const zona = zonaCupon(doc);
  if (!zona) return false;

  let actual: string | null = null;
  const indicador = crearIndicador(doc, () => comprobar(true));
  zona.ticket.after(indicador.anfitrion);

  function comprobar(forzar = false): void {
    const numero = leerNumero(doc);
    if (numero === actual && !forzar) return;
    actual = numero;

    if (!numero) {
      indicador.mostrar({ tipo: "oculto" });
      return;
    }
    indicador.mostrar({ tipo: "consultando", numero });
    consultar(numero).then(
      (respuesta) => {
        // Si el número ha cambiado mientras tanto, esta respuesta ya no interesa.
        if (actual === numero) indicador.mostrar({ tipo: "resultado", respuesta });
      },
      () => {
        if (actual === numero) indicador.mostrar({ tipo: "error", numero });
      },
    );
  }

  let temporizador: ReturnType<typeof setTimeout> | undefined;
  new MutationObserver(() => {
    clearTimeout(temporizador);
    temporizador = setTimeout(comprobar, esperaMs);
  }).observe(zona.numero, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
  });

  comprobar();
  return true;
}
