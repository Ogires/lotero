// Estilos del indicador y del diálogo. Se inyectan dentro del Shadow DOM, así que no
// afectan a la página ni la página a ellos (salvo la herencia de fuente, que se fija aquí).

export const ESTILOS = `
:host { all: initial; display: block; margin: 8px 0 12px; }
:host([hidden]) { display: none; }
* { box-sizing: border-box; }

.indicador {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  padding: 8px 12px; border-radius: 8px; border: 1px solid #c9d3cc;
  background: #f4f7f5; color: #1d2b22;
  font: 14px/1.35 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}
.indicador::before { content: ""; width: 10px; height: 10px; border-radius: 50%; background: #8a9a90; flex: none; }
.indicador--consultando::before { animation: latido 1s ease-in-out infinite; }
.indicador--premiado { background: #fff6dc; border-color: #e8c35a; color: #4a3600; }
.indicador--premiado::before { background: #d99a00; }
.indicador--nuevo { background: #eef7f1; border-color: #9fceb0; }
.indicador--nuevo::before { background: #2e8b57; }
.indicador--error { background: #f6f6f6; border-color: #d0d0d0; color: #444; }
.indicador--error::before { background: #b0b0b0; }
.texto { flex: 1 1 auto; }

button { font: inherit; cursor: pointer; }
.accion {
  border: 1px solid currentColor; background: transparent; color: inherit;
  border-radius: 6px; padding: 3px 10px; font-weight: 600;
}
.accion:hover { background: rgba(0, 0, 0, 0.06); }
.accion:focus-visible, .cerrar:focus-visible { outline: 2px solid #1a73e8; outline-offset: 2px; }

.dialogo {
  width: min(640px, calc(100vw - 32px)); max-height: min(80vh, 640px);
  padding: 0; border: none; border-radius: 12px; color: #1d2b22; background: #fff;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
  font: 14px/1.4 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}
.dialogo[open] { display: flex; flex-direction: column; }
.dialogo::backdrop { background: rgba(0, 0, 0, 0.45); }
header { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid #e3e8e5; }
h2 { margin: 0; font-size: 18px; font-weight: 650; }
.cerrar { border: none; background: transparent; font-size: 26px; line-height: 1; padding: 0 4px; color: #555; }
.contenido { overflow: auto; padding: 4px 18px; }
table { width: 100%; border-collapse: collapse; }
th { text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; color: #5b6b61; padding: 10px 8px 6px; }
td { padding: 8px; border-top: 1px solid #eef1ef; vertical-align: top; }
td:first-child { white-space: nowrap; font-variant-numeric: tabular-nums; }
.principal { font-weight: 650; }
.etiqueta { display: inline-block; font-size: 11px; font-weight: 700; padding: 1px 6px; border-radius: 4px; margin-right: 2px; }
.etiqueta--once { background: #e2f1e7; color: #1b6b3a; }
.etiqueta--lnac { background: #e3ecfb; color: #1f4d99; }
.sorteo { display: block; font-size: 12px; color: #5b6b61; }
.nota { margin: 0; padding: 10px 18px 14px; font-size: 12px; color: #5b6b61; border-top: 1px solid #e3e8e5; }

@keyframes latido { 50% { opacity: 0.3; } }
@media (prefers-reduced-motion: reduce) { .indicador--consultando::before { animation: none; } }
`;
