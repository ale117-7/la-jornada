# La Jornada — contexto para continuar

Juego automático (idle) que solo avanza mientras el jugador trabaja. Diseño completo en `DISENO_JUEGO.md` y `EVENTOS_Y_RUTA.md` (este último manda en tiempos y eventos). **Léelos antes de tocar nada.**

## Estado

Hechas las 5 fases de la sección 14 del diseño (1, 1.5, 2, 3, 4 y 5). Lo que queda es contenido, arte y los pendientes de abajo.

Nada está en git (la carpeta no es un repositorio).

## Stack y comandos

Vite + TypeScript + Canvas 2D, con carcasa Electron (overlay transparente). Windows.

- `npm run dev` → web en `http://localhost:5173/?debug=1` (panel debug: velocidad, saltar a hora, semilla, forzar Encrucijada, fecha).
- `npm run sim` → día de 8 h en segundos; imprime línea de tiempo, tabla de objetivos de ritmo y mayor hueco sin novedades.
  - `-- --seed=N --hours=N --quiet`
  - `-- --balance=100` (muchas semillas: mín / mediana / máx de cada objetivo)
  - `-- --variety`, `-- --compare`
  - `-- --ritmo=20 --hours=16`: hora a hora, cosas notables (sucesos, Encrucijadas, edificios, hitos, artefactos, mutaciones, mascotas, sinergias), mayor hueco sin nada notable, tramos, caídas, mejoras y monedas sin gastar.
- `npm run desktop` → app de escritorio. `npm run dist` → instalador y portable en `release/`.
- `npm run build` → comprobación de tipos + build web.

## Arquitectura

- `src/data/*.ts` — **todo el contenido como datos** (eras, familias, modificadores, eventos, cadenas, condiciones, ruta/sub-capas, reliquias, mutaciones, compañeros, pactos, destino, combos, edificios, balance). Añadir contenido = añadir objetos.
- `src/core/` — simulación pura, sin DOM:
  - `sim.ts` (tick de 100 ms + simulación rápida por encuentros), `zone.ts`, `creatures.ts`
  - `world.ts` (motor de sucesos: eventos, cadenas, sub-capas, mutaciones), `worldMods.ts`
  - `crossroads.ts` (Encrucijadas), `build.ts` (etiquetas, sinergias, combos, Presión → `mods`), `base.ts` (Base Colgante, oficios, mascotas)
  - `mods.ts` (modificadores numéricos `Efectos`), `game.ts` (reloj real, huecos, cambio de día, guardado), `save.ts` (esquema versión 4)
- `src/ui/`, `src/render/renderer.ts`, `src/main.ts` — panel web. `src/overlay.ts` — overlay.
  - `ui/chronicleUi.ts` + `core/chronicle.ts` (Crónica: gráfico, racha, récords), `ui/settingsUi.ts` (pantalla de ajustes), `data/omens.ts` (presagio del día).
- `src/render/` — dibujo (solo lee el estado):
  - `renderer.ts` orquesta. Compara cada estado con el anterior para generar efectos (bajas, golpes, daño recibido, caídas, mejoras, Umbral a la vista, carteles de capa y sub-capa) y suaviza la cámara entre estados (el overlay recibe 10 por segundo). `SPRITES` es el registro para cambiar el arte.
  - `background.ts` (cielo, haces de luz, siluetas por corriente con parallax, Base Colgante, ambiente, cornisa), `fx.ts` (partículas, textos, anillos, carteles, temblor; resplandores pre-dibujados, sin `shadowBlur`), `theme.ts` (paletas por corriente que se oscurecen con la profundidad).
    - `background.ts` admite ganchos `far`/`near` (capas extra detrás y delante de las siluetas), `suelo` (espejo, membrana, hueso, luz), `ambient` (sustituye al de la corriente), `mezcla` (casillas de las 3 corrientes) y `antiguo` (la ciudad con frontones).
    - `theme.ts` → `variantTheme(paleta, variante)`: paletas de sub-capa y de escena (mercurio, estática, orgánico, vacío, ahogado, fábrica, hueso, antiguo, latido, ruido, calma, pintada), con caché.
  - `mechanics.ts`: la lectura visual de las 11 mecánicas de sub-capa (`MECH_LOOK` = paleta, ambiente y suelo de cada una; capas lejana, cercana y delantera; Flotación, Costilla del Gigante; marcadores). Sin estado: todo sale del estado y del tiempo trabajado.
  - `scenes.ts`: escenas de sucesos (`SCENES`): las 10 rarezas, Apagón, Eclipse de Neón, Marea Negra, Luna Interior y Tormenta de Esporas. Cada escena sale de `world.eventos/eventosT` y dura lo que su buff del mismo nombre (o un tiempo propio si el suceso es instantáneo). Las escenas ancladas a la pared guardan la posición de cámara al empezar (`anchors` en el renderer). Los buffs con escena no llevan además el tinte genérico (`SCENE_BUFF_NAMES`).
  - Marcadores (`Chip`): bajo la señalética en el panel; en el overlay, como mucho 2 en la esquina superior derecha (se ocultan mientras hay un aviso). Cada suceso nuevo saca un aviso arriba a la derecha (las rarezas, doradas y con destello); cada fragmento de Recuerdos, otro.
  - Con mucho tiempo de golpe (más de 1,5 s entre estados: velocidad de depuración, volver de una pestaña oculta) solo se muestran los carteles, no las partículas. En pausa todo queda congelado.
- **Arte (desde el 21/11):** todo el juego usa los sprites de `IMAGENES/` (157 hojas recortadas, organizadas como la Biblia de arte `docs/guia-arte.html`).
  - `python scripts/arte/empaquetar.py` reduce y empaqueta cada hoja en `public/arte/<id>.webp` (las bandas de escenario, una imagen cada una) y escribe `src/render/art/manifest.json` (cuadros `[página, x, y, w, h, anclaX, anclaY]` por fila; ancla = centro del cuerpo y pie). Volver a pasarlo si cambia algo en `IMAGENES/`. Son ~44 MB y van en `dist/arte`.
  - `src/render/art/catalog.ts` es **el único sitio** que dice qué hoja y qué filas/columnas son cada animación de cada cosa (héroe por corriente, chasis, compañeros, mascotas, familias y sus variantes de híbrido, jefes de era por capa y corriente, Umbral menor, Costilla, Umbrales de sub-capa y de Ciclos, élites por nombre, personajes de sucesos y cadenas, iconos de sucesos, modificadores, mutaciones, sinergias, placas, módulos de la Base, equipo y escenarios). `pick.ts` elige el arte a partir del estado; `sprites.ts` carga las páginas bajo demanda, anima, tiñe (destello, híbridos, malla/antiguo/holo/plata) y pinta contorno.
  - Mientras una hoja no ha cargado, se dibuja la forma geométrica de antes (sigue en el renderer como respaldo).
  - Escenarios: 3 bandas de parallax (la lejana y la media detrás, lo «lejano» de mecánicas y escenas entre la media y la cercana) y la cornisa con el pie de la banda cercana. Los suelos con mecánica (espejo, membrana, luz) siguen siendo de código.
  - Las 15 escenas de sucesos usan sus hojas con el dibujo de código como respaldo. Los avisos llevan icono o retrato; los encuentros y las cadenas con personaje (Rival, Niño de Hojalata, Huésped) sacan además al personaje acompañando al grupo 12 s.
  - Paneles: miniaturas con `spriteHtml` (`src/ui/art.ts`): cartas de Encrucijada, build, sinergias, Base, equipo, mascotas y mutaciones.
  - Vitrina con `?debug=1`: `__arte({ era: 2, corriente: 'A', chasis: 'raiz', hora: 7, sucesos: ['la_mirada'], umbral: 'El Capataz', overlay: true })` dibuja una copia del día sin tocar la partida; `__arte.off()` la quita.
- `electron/` — proceso principal: **la simulación vive solo ahí**; las ventanas reciben el estado por IPC (`RemoteGame`).
  - Las preferencias de escritorio (`DesktopSettings` en `core/api.ts`: opacidad, desvanecer, ocultar en pantalla completa, FPS, pausa por inactividad…) se guardan en `overlay-config.json`, no en la partida. Se cambian con el comando IPC `setDesktop`.
  - `electron/fullscreen.ts`: un proceso de PowerShell consulta la API de Windows cada 2 s para saber si hay una app en pantalla completa (Electron no lo expone). Se cierra al salir.
- Pruebas en ejecución del escritorio: `npx electron --inspect=9229 .` y evaluar contra `globalThis.__jornada` (solo en desarrollo o con `--jornada-debug`; también vale con el portable: `LaJornada-Portable-0.1.0.exe --jornada-debug --inspect=9230`).
  - Si hay una app a pantalla completa en el monitor del overlay, el overlay se oculta y no dibuja (es lo esperado). Para probar sin molestar: `__jornada.setDesktop('displayId', <id del otro monitor>)` y luego `null` para devolverlo.
  - CPU: `process.mainModule.require('electron').app.getAppMetrics()` (llamar una vez para poner a cero, esperar y volver a llamar).
- Depuración web (`?debug=1`): `window.__game` (`jumpToHour`, `setSpeed`, `resetDay`, `chooseCard`…) y `window.__advanceDraw(ms)`, que avanza el dibujo a mano (la pestaña oculta apenas recibe frames y los carteles no caducan). Para ver el overlay sin Electron: `import('/src/render/renderer.ts')` y dibujar en un lienzo de ~110 px con `{ overlay: true }`.
- `npm run dist` genera también el icono (`scripts/make-icon.mjs` → `build/icon.png`). `build/installer.nsh` borra al desinstalar la entrada de «Iniciar con Windows» y el identificador de notificaciones, pero no al actualizar (`${isUpdated}`). Ojo: al instalar encima de una versión anterior al 21/11 corre su desinstalador viejo, que sí borra «Iniciar con Windows».

## Overlay de escritorio: cosas no obvias (probadas con ratón y teclado reales)

- **Click-through:** el renderer del overlay envía los rectángulos de `#controls` y `#cards` (`overlay:hit-rects`). El proceso principal sondea el cursor (cada 33 ms cerca y 150 ms lejos) y activa o desactiva `setIgnoreMouseEvents`. **No** usar `mouseenter`/`mouseleave` en el renderer para eso: con los eventos reenviados entra en un bucle de parpadeo.
- `setIgnoreMouseEvents(…, { forward: true })` es **imprescindible**: sin el reenvío, Chromium descarta los clics en esta ventana transparente que no toma el foco. Como instala un gancho global de ratón en el hilo principal, ese hilo no debe hacer trabajo pesado (bandeja, registro y ajustes van con caché).
- **Tras cada `showInactive()`, hay que reasignar los límites** (`showOverlay()` llama a `applyLayout()`). Si no, Chromium se queda con la posición desfasada y descarta los clics.
- En Windows todas las ventanas «siempre encima» comparten nivel: el overlay se reafirma encima con `moveTop()` cada 2 s, sin tomar el foco.
- Se captura el recuadro de controles entero (no solo cada botón) para que el primer clic no se pierda.
- **Pantalla completa:** `electron/fullscreen.ts` informa del monitor afectado, y solo se oculta el overlay si está en ese mismo monitor. El vigilante reintenta si muere; si no puede, Ajustes muestra «no disponible».
- **Atajos:** los por defecto evitan combinaciones que Windows produce con AltGr (AltGr = Ctrl+Alt): Q (@ en Latinoamérica), E (€ en España) y vocales (tildes en EE. UU. internacional). También evitan Ctrl+Alt+↑/↓, que usa VS Code. En este equipo, otra app ocupa `Ctrl+Alt+Espacio`, `Ctrl+Alt+Shift+O` y `Ctrl+Alt+Shift+H`: Trabajar/Pausa queda en `Ctrl+Alt+Shift+Espacio` y mostrar/ocultar en `Ctrl+Alt+H`. Se cambian o quitan desde Ajustes, pulsando la combinación.
- `overlay-config.json` se valida campo a campo y se escribe de forma atómica; si está roto se aparta como `.bad-<fecha>`. `configVersion` 2 migró los atajos viejos.
- **Partida:** si `save.json` no se puede cargar, se copia a `save.rechazado-<fecha>.json` antes de escribir. Si es de una versión más nueva, la app no guarda nada (solo lectura) y avisa.
- **Pausa por inactividad (opcional):** tras 60 s sin actividad el tiempo se retiene (`Game.hold`). Si vuelves antes del límite cuenta; si no, se descarta y se pausa.
- **Notificaciones de la portable:** registra `HKCU\Software\Classes\AppUserModelId\com.lajornada.app` (sin eso Windows no las muestra). El instalador usa su acceso directo.
- Si el overlay se cuelga se recarga; a la 4.ª vez en un minuto se recrea, y a la 5.ª se oculta hasta que el usuario lo vuelve a pedir.
- Al apagar o cerrar sesión se guarda (`session-end`). En juego se autoguarda cada 15 s.
- Consumo medido: ~1 % de un núcleo jugando y ~0,5 % en pausa (12 núcleos: ~0,1 % del total). En pausa el estado se envía 1 vez por segundo, no 10, y el overlay no recibe la Crónica.
  - Medido el 18/11 con las mecánicas y escenas (overlay de 1585×111 a 30 fps, 20–30 s por caso, todos los procesos): sin sub-capa 1,28 %; Carga 1,39 %; Ensamblaje 1,38 %; Déjà vu 1,34 %; Pulso 1,41–1,51 %; tres escenas a la vez 1,43 %. Dibujar un frame del overlay cuesta 0,11–0,26 ms.

## Ritmo del día (punto 2)

- **Nada notable más de 10 min:** el suceso se adelanta si pasan `EVENT_RULES.maxSinNovedadMin` minutos sin una novedad que no sea una criatura (`novedad.lastOtrasMs`). Los modificadores nuevos de criatura cuentan como novedad menor (`novedad(s, true)`). La 2.ª familia es un hito (sale en el aviso del overlay).
- **Monedas con salida en Lo Hondo:** tres obras de la Base de la Era V (Ancla del Abismo, Forja del Fondo, Faro de Lo Hondo) para los Materiales, y dos mejoras sin tope (Eco del Fondo y Destilado del Fondo, con `eraMin: 5`) para los Ecos y la Esencia. La Esencia guarda antes lo necesario para el equipo y las mascotas (`reservaEsencia`).
- **Subidas de poder visibles:** «▲ DPS +N %» sobre el Descensor cuando el DPS supera en un 25 % el mayor ya anunciado (cada 15 s como mucho).
- Medido el 19/11 (`--ritmo=30 --hours=16`, medianas por hora):
  - El hueco sin nada notable es de 10 min en todas las horas (peor caso, 14 min en la hora 1–2). Antes eran 14–18 min, con picos de 20.
  - Hay de 9 a 22 cosas notables por hora; en Lo Hondo, de 10 a 15 (antes, de 7 a 11).
  - Lo Hondo: de 3 a 16 caídas y de 12 a 30 tramos por hora. Antes, en las horas 10–16, eran de 17 a 36 caídas y de 9 a 19 tramos.
  - Monedas sin gastar a las 16 h: unos 50 K de Materiales, 30 K de Esencia y 4–7 K de Ecos. Antes eran 1 M, 265 K y 17 K.

## Mecánicas de sub-capa con ritmo propio

- **Carga** y **Pulso** ya no son modificadores planos: `CARGA` y `PULSO` en `core/worldMods.ts`. En `tick`, `golpeMundo(s, hits)` multiplica cada golpe (Carga: ×5 en cada 10.º golpe; Pulso: ×2,25 durante 2 s de cada 10) y `continuoMundo` el veneno. En `fastAdvance` se usan las medias (`golpeMundoMedio`: ×1,4 y ×1,25), que rinden exactamente lo mismo. El DPS del panel muestra la media.
- `mechanicStatus(s, id)` da el estado vivo de la mecánica (carga, fase de la respiración, próximo latido, Recuerdos, costillas, calma) para el panel «Hoy».
- Las demás mecánicas ya funcionaban por datos (Reflejos: botín ×1,3 del reflejo; Respiración: velocidad ×1,5/×0,75; Flotación: +2 criaturas; Ensamblaje: las 3 corrientes y −20 % de vida; Escalada: costilla cada 5 tramos; Déjà vu: familias del Brocal «antiguas»; Glitch: nombres corruptos; Calma: sin criaturas 5 min).

## Reglas que hay que respetar

- Nunca `Math.random()` en la lógica: RNG con semilla guardado en el estado.
- Cualquier cambio en la simulación debe funcionar en los dos modos (`tick` y `fastAdvance`).
- Si cambia la forma de `DayState`, subir `SAVE_VERSION` y añadir la migración.
- Tras tocar balance o contenido que dé poder, volver a pasar `npm run sim -- --balance=100`: los 5 objetivos de la sección 8 deben cumplir (±15 %) y el hueco sin novedades ser ≤ 12 min.
- Interfaz y textos en español. Mundo original: sin nombres de obras existentes.

## Balance de Lo Hondo (Era V)

- `ERAS[4].hondura` (en `src/data/eras.ts`) añade crecimiento extra por tramo dentro de la era: fuerte los primeros 40 tramos y suave después (vida ×1,04 y ataque ×1,03 por tramo). Sin esto el héroe solo estaba limitado por su velocidad de carrera y no caía nunca.
- Tras caer ante las criaturas de un tramo, el héroe retrocede `FARM_BACK` tramos a farmear (`ZONE_FARM_MS` por caída, hasta ×`FARM_MAX_MULT`) y el tramo vuelve debilitado (`wallDebuff` en `zone.ts`, el mismo debuff que los Umbrales). Vale desde la Era II; en el Brocal el héroe insiste sin retirarse.
- La regeneración comprada tiene tope (8 %/s antes de multiplicadores).
- `npm run sim -- --balance=N` imprime «Lo Hondo, por hora: caídas mín / mediana / máx». Orientativo: mediana entre 3 y 20. Varía mucho según la build (hay builds tanque que casi no caen).

## Pendientes y limitaciones conocidas

- **Hecho (tarea 4):** las 11 mecánicas de sub-capa tienen lectura visual propia en panel y overlay, y Carga y Pulso funcionan de verdad. Las 10 rarezas y Apagón, Eclipse de Neón, Marea Negra, Luna Interior y Tormenta de Esporas tienen escena. Lo que sigue simplificado:
  - El resto de sucesos (encuentros, Base, compañeros, tesoros y los demás peligros y climas) solo tienen el aviso del suceso y el tinte genérico de su `visual`.
  - Recuerdos: los fragmentos salen en el registro y en un aviso, no en la Crónica. Lluvia de Placas: los nombres son solo visuales (no se guardan). El Descensor de Ayer es una silueta fantasma genérica, no la build de ayer.
  - Carga: las ramas del rayo hacia otras criaturas son solo visuales (el daño va al objetivo). Flotación: el giro del Descensor es visual. Ensamblaje: las «capas a medio hacer» son andamios y grúas, no las capas reales.
  - La Puerta Pintada cambia paleta y ambiente 10 min, pero no es una capa con criaturas propias. La Canción: las criaturas cantan (ataque 0), aunque el Descensor sigue golpeándolas.
  - Glitch: en el panel los colores van invertidos toda la hora; en el overlay solo hay ráfagas de matiz, para no poner una franja blanca sobre las apps.
  - No hay cinemática para «el fondo es un cielo» (15:30) ni para «El suelo se abre» (5:00): solo el aviso y el cartel de capa.
  - En los Ciclos Invertidos se suman las capas de las 2 mecánicas, pero la paleta es la de la primera.
- Arte integrado (ver Arquitectura). Limitaciones: muchas hojas de criaturas traen variantes de color en vez de cuadros de animación, así que varias criaturas tienen 1–2 cuadros de reposo (el código las balancea); los chasis no tienen estocada propia salvo Ganzúa y Sabueso; las bandas de escenario no son repetibles de origen (se alternan espejadas). Probado el 21/11 en la web y en Electron (overlay y panel reales, Brocal y Lo Hondo): carga por `file://` sin problemas; CPU total 1,11 % con el overlay (12 núcleos), memoria ~160 MB la ventana del overlay y ~140 MB la GPU.
- **Probado con ratón y teclado reales:** click-through, botón de pausa, aviso, cartas, «Decidir luego», arrastre de la ventana flotante, atajos globales y que nada robe el foco. **Falta probar a mano:** grabar un atajo pulsándolo con el teclado real (con eventos simulados funciona), instalar con el `.exe` de instalación y «Iniciar con Windows» con un cierre de sesión real.
- La pausa por inactividad se probó simulando el tiempo inactivo del sistema, no esperando los minutos reales.
- No hay botón «Terminar jornada» (opcional del diseño).
- `release/` regenerado el 21/11 con el arte integrado.
- El vigilante de pantalla completa es un `powershell.exe` residente (~50 MB) que compila un poco de C#. En equipos corporativos con antivirus estricto o PowerShell restringido puede no funcionar (Ajustes lo indica).
- La simulación rápida y la detallada dan la misma distribución de tramos y caídas (comparadas con 30 semillas), pero una misma semilla diverge entre modos: los saldos sin gastar de monedas secundarias no son comparables uno a uno.
- En Lo Hondo aún se acumula algo de Materiales, Esencia y Ecos al final de los días largos: las obras y mejoras de Lo Hondo suben de coste ×1,3–×1,55 por nivel. Los Fragmentos se gastan bien.
- Los Umbrales de era tardan de 24 a 31 min desde que se ven hasta que caen (con retiradas a farmear entre medias). Cumplen los objetivos, pero se podría acortar esa espera con `BOSS_TIME_DEBUFF_PER_MIN`.
