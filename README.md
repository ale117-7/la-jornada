# La Jornada

Juego automático (idle) en forma de overlay transparente de ~110 px que avanza mientras trabajas. Gratis y de código abierto. Windows.

## Descargar

En **Releases** hay dos archivos:
- `LaJornada-Setup-x.y.z.exe`: instalador.
- `LaJornada-Portable-x.y.z.exe`: portable, sin instalar.

> **Aviso de Windows SmartScreen.** El ejecutable no está firmado (firmar cuesta dinero), así que Windows puede mostrar «Windows protegió tu PC». Pulsa **Más información → Ejecutar de todas formas**. Todo el código está en este repositorio y puedes compilarlo tú mismo.

## Compilar

Requiere Node.js 22+.

```
npm ci
npm run dev        # versión web en http://localhost:5173/?debug=1
npm run desktop    # app de escritorio (Electron)
npm run dist       # instalador y portable en release/
npm run sim        # simula un día de 8 h en segundos
```

El diseño y la arquitectura están en `DISENO_JUEGO.md`, `EVENTOS_Y_RUTA.md` y `CONTEXTO.md`. `docs/guia-arte.html` es la guía de arte con todas las piezas.

## Licencia

Código: [MIT](LICENSE). Arte (generado con IA): [CC0](LICENSE-ARTE), dominio público. Las hojas de sprites completas se publican aparte en Releases.
