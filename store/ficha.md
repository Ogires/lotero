# Ficha de la Chrome Web Store

Ítem `fjhfpeoladdmpmkpokimjcpedebgcnba`. Para leerlo bien en VS Code: `Ctrl+Shift+V`. Los textos
para copiar van en las citas (barra a la izquierda). Las capturas se regeneran con
`npm run capturas -w extension`.

## 1. Package

**Paquete:** F:\2026\lotero\lotero\extension\lotero-1.0.0.zip

## 2. Store listing

**Category:** Tools (Herramientas)

**Language:** Español

**Description:**

> ¿Ya ha salido premiado este número?
>
> Lotero lo indica directamente en las páginas de compra de juegosonce.es. Debajo del cupón aparece si ese número ha salido premiado alguna vez en un sorteo de la ONCE o de la Lotería Nacional y cuántas veces. Con «Ver premios» se ve la fecha, el sorteo, el tipo de premio y la serie de cada uno.
>
> Funciona en:\
> • Cupón Diario\
> • Cuponazo\
> • Sueldazo Fin de Semana
>
> Sirve tanto para el número que propone la web como para el que eliges dígito a dígito: el indicador se actualiza al cambiarlo.
>
> Los resultados cubren los sorteos de la ONCE desde 1996 y los de la Lotería Nacional, y se actualizan cada día.
>
> Privacidad\
> • No pide ningún permiso al navegador.\
> • Solo funciona en esas tres páginas de juegosonce.es.\
> • Solo envía el número del cupón para consultarlo. Sin datos personales, cookies, analítica ni publicidad.\
> • Código abierto: https://github.com/Ogires/lotero
>
> Lotero es una herramienta no oficial. No está afiliada a la ONCE ni a Loterías y Apuestas del Estado. Comprueba siempre los resultados oficiales.

La descripción corta sale del `description` del manifest (máx. 132 caracteres): «Comprueba en
juegosonce.es si el número del cupón ya ha salido premiado en la ONCE o en la Lotería Nacional. No
oficial.»

### Graphic assets

| Campo | Archivo |
|---|---|
| Store icon (128×128) | F:\2026\lotero\lotero\extension\iconos\icono-128.png |
| Screenshot 1 (número premiado) | F:\2026\lotero\lotero\store\capturas\1-premiado.png |
| Screenshot 2 (detalle de premios) | F:\2026\lotero\lotero\store\capturas\2-detalle.png |
| Screenshot 3 (nunca premiado) | F:\2026\lotero\lotero\store\capturas\3-nunca-premiado.png |
| Small promo tile (440×280) | F:\2026\lotero\lotero\store\capturas\mosaico-440x280.png |

Borrar las capturas de 2019 si siguen en la ficha. Vídeo y marquee: vacíos.

### Additional fields

**Homepage URL:** https://ogires.github.io/lotero/

**Support URL:** https://github.com/Ogires/lotero/issues

**Official URL:** vacío (exige verificar el dominio). **Mature content:** No.

## 3. Privacy

**Single purpose description:**

> Indicar en las páginas de compra de juegosonce.es (Cupón Diario, Cuponazo y Sueldazo Fin de Semana) si el número del cupón mostrado ya ha salido premiado en algún sorteo anterior de la ONCE o de la Lotería Nacional.

**Host permission justification** (la extensión no declara permisos; el campo aparece por el
content script):

> El content script solo se inyecta en tres páginas de compra de juegosonce.es para leer el número del cupón que muestra la página y pintar debajo si ha salido premiado. No accede a ningún otro sitio.

**Remote code:** No, I am not using remote code. Todo el JavaScript va en el paquete; la API solo
devuelve datos JSON.

**Data usage:** marcar solo **Website content**. El número del cupón sale de la página y se envía a
la API; no es un dato personal, pero declararlo cuadra con la política de privacidad. Marcar las
tres certificaciones:

- No vendo ni transfiero datos de usuarios a terceros, salvo en los casos de uso aprobados.
- No uso ni transfiero datos de usuarios para fines no relacionados con el propósito único del elemento.
- No uso ni transfiero datos de usuarios para determinar la solvencia o conceder préstamos.

**Privacy policy URL:** https://ogires.github.io/lotero/privacidad.html

## 4. Distribution

Free of charge · Visibility **Public** · All regions (o solo España).

## 5. Test instructions (nota para el revisor)

> Para probarla: abrir https://www.juegosonce.es/cuponazo y elegir un número con las flechas de los dígitos (por ejemplo 5-4-7-3-2). Bajo el cupón aparece si ha salido premiado; «Ver premios» abre el detalle. Versión 1.0.0: reescritura completa en Manifest V3 de la versión 0.1 (MV2) retirada.
