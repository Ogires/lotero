// Punto de entrada del content script (esbuild lo empaqueta como IIFE en dist/contenido.js).

import { crearConsultor } from "./api";
import { iniciar } from "./contenido";

iniciar(document, crearConsultor());
