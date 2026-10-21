# Ficha de la Chrome Web Store

Textos para copiar en el Developer Dashboard (ítem `fjhfpeoladdmpmkpokimjcpedebgcnba`).
Capturas en `store/capturas/` (se regeneran con `npm run capturas -w extension`).

## Package

Subir `extension/lotero-<versión>.zip` (`npm run empaquetar -w extension`).

## Store listing

**Idioma:** Español

**Categoría:** Herramientas (Tools)

**Descripción corta** (sale del `description` del manifest, máx. 132 caracteres):

> Comprueba en juegosonce.es si el número del cupón ya ha salido premiado en la ONCE o en la Lotería Nacional. No oficial.

**Descripción detallada:**

```
¿Ya ha salido premiado este número?

Lotero lo indica directamente en las páginas de compra de juegosonce.es. Debajo del cupón aparece si ese número ha salido premiado alguna vez en un sorteo de la ONCE o de la Lotería Nacional y cuántas veces. Con «Ver premios» se ve la fecha, el sorteo, el tipo de premio y la serie de cada uno.

Funciona en:
• Cupón Diario
• Cuponazo
• Sueldazo Fin de Semana

Sirve tanto para el número que propone la web como para el que eliges dígito a dígito: el indicador se actualiza al cambiarlo.

Los resultados cubren los sorteos de la ONCE desde 1996 y los de la Lotería Nacional, y se actualizan cada día.

Privacidad
• No pide ningún permiso al navegador.
• Solo funciona en esas tres páginas de juegosonce.es.
• Solo envía el número del cupón para consultarlo. Sin datos personales, cookies, analítica ni publicidad.
• Código abierto: https://github.com/Ogires/lotero

Lotero es una herramienta no oficial. No está afiliada a la ONCE ni a Loterías y Apuestas del Estado. Comprueba siempre los resultados oficiales.
```

**Capturas (1280×800):**

1. `capturas/1-premiado.png`: número premiado dos veces en el Cuponazo.
2. `capturas/2-detalle.png`: detalle de los premios.
3. `capturas/3-nunca-premiado.png`: número que nunca ha salido, en el Cupón Diario.

**Mosaico promocional pequeño (440×280):** `capturas/mosaico-440x280.png`

**Web oficial / de asistencia:** `https://ogires.github.io/lotero/`

## Privacy practices

**Propósito único:**

```
Indicar en las páginas de compra de juegosonce.es (Cupón Diario, Cuponazo y Sueldazo Fin de Semana) si el número del cupón mostrado ya ha salido premiado en algún sorteo anterior de la ONCE o de la Lotería Nacional.
```

**Justificación de permisos:** la extensión no declara permisos ni `host_permissions`. Si el formulario
pide justificar el acceso a sitios (por el content script):

```
El content script solo se inyecta en tres páginas de compra de juegosonce.es para leer el número del cupón que muestra la página y pintar debajo si ha salido premiado. No accede a ningún otro sitio.
```

**Código remoto:** No, no uso código remoto. (Todo el JavaScript va en el paquete; la API solo devuelve datos JSON.)

**Uso de datos:** no marcar ninguna categoría de datos recogidos. El número del cupón no es un dato
personal ni identifica al usuario. Marcar las tres certificaciones:

- No vendo ni transfiero datos de usuarios a terceros, salvo en los casos de uso aprobados.
- No uso ni transfiero datos de usuarios para fines no relacionados con el propósito único del elemento.
- No uso ni transfiero datos de usuarios para determinar la solvencia o conceder préstamos.

**Política de privacidad:** `https://ogires.github.io/lotero/privacidad.html`

## Distribution

Pública, todos los países (o solo España).

## Notas para el revisor (opcional)

```
Para probarla: abrir https://www.juegosonce.es/cuponazo y elegir un número con las flechas de los dígitos (por ejemplo 5-4-7-3-2). Bajo el cupón aparece si ha salido premiado; «Ver premios» abre el detalle. Versión 1.0.0: reescritura completa en Manifest V3 de la versión 0.1 (MV2) retirada.
```
