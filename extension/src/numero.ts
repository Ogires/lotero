// Lectura del número de cupón en las páginas de producto de juegosonce.es.
// La web muestra los dígitos elegidos en cinco <span> dentro de `.buscacupon-ticket__numero`
// y los sustituye al cambiar cada dígito. El `input#numero` oculto solo lo rellena el
// servidor (p. ej. con sesión iniciada), así que se usa como alternativa.

export interface ZonaCupon {
  /** Imagen del cupón; el indicador se coloca justo después. */
  ticket: HTMLElement;
  /** Contenedor de los dígitos, que se observa para detectar cambios. */
  numero: HTMLElement;
}

export function zonaCupon(raiz: ParentNode): ZonaCupon | null {
  const numero = raiz.querySelector<HTMLElement>(".buscacupon-ticket__numero");
  const ticket = numero?.closest<HTMLElement>(".buscacupon-ticket");
  return numero && ticket ? { ticket, numero } : null;
}

/** Número de cinco cifras que muestra el cupón, o `null` si está incompleto. */
export function leerNumero(raiz: ParentNode): string | null {
  const zona = zonaCupon(raiz);
  if (!zona) return null;

  const digitos = [...zona.numero.querySelectorAll("span")]
    .map((span) => span.textContent?.trim() ?? "")
    .join("");
  if (/^\d{5}$/.test(digitos)) return digitos;

  const oculto = zona.numero.querySelector<HTMLInputElement>("input#numero")?.value.trim() ?? "";
  return /^\d{5}$/.test(oculto) ? oculto : null;
}
