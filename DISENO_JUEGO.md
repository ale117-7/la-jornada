# LA JORNADA — Documento de diseño para implementación

> **Para Fable:** este documento define las **mecánicas** del juego. El arte se decidirá después: usa formas geométricas y colores como placeholder, y deja todo preparado para cambiar sprites sin tocar la lógica (cada entidad tiene un `spriteKey`).
> **Documento complementario obligatorio:** [`EVENTOS_Y_RUTA.md`](EVENTOS_Y_RUTA.md) contiene la ruta hora por hora hasta 16 h +, las condiciones del día, el catálogo de eventos, las rarezas y las cadenas. Si algo choca con este documento en tiempos o eventos, manda `EVENTOS_Y_RUTA.md`.
> Lee ambos documentos completos antes de empezar. Implementa por fases (sección 14) y verifica cada fase con los criterios de aceptación.

---

## 1. Concepto en una frase

Un juego **automático** (idle + incremental) en el que un explorador corre en horizontal por las paredes de un **abismo sin fondo**, bajando cada vez más hondo y matando criaturas, mientras detrás de él una **Base Colgante** crece hasta convertirse en una ciudad suspendida sobre el vacío (ver 2.1). El juego **solo avanza mientras el jugador está trabajando** (botón Trabajar/Pausa), **se reinicia cada día** y cada 1–2 horas presenta una **Encrucijada**: 3 opciones importantes que hacen que ninguna jornada sea igual.

## 2. Pilares (no negociables)

1. **Cero interacción obligatoria.** Todo pasa solo: combate, compras, mejoras, construcción y equipamiento. El único input es **Trabajar/Pausa** y, cada 1–2 h, **elegir 1 de 3 cartas** en una Encrucijada.
2. **El tiempo trabajado es el recurso principal.** Con el juego en pausa (o cerrado) el mundo se congela. No hay progreso offline.
3. **Cada día es una partida nueva.** No hay ningún poder, moneda ni mejora que pase de un día a otro. Solo se guarda un **historial informativo** (la Crónica, sección 12) que no afecta al juego.
4. **Sorpresa constante.** Empieza lento y sencillo, y cada hora aparecen sistemas, criaturas y eventos nuevos. El contenido es procedural y la semilla diaria es distinta, así que nunca se ve el mismo día dos veces.
5. **Motivar 5+ horas.** Los momentos más especiales están detrás de las horas 3, 4 y 5. Pasadas las 5 h empiezan las **Horas Extra**, con contenido raro e infinito.

## 2.1 Mundo y ambientación: EL ABISMO

> **Importante:** el mundo es **original**. Está *inspirado en tres sensibilidades estéticas*: (1) la maravilla y el peligro de descender por un abismo con capas de ecosistemas cada vez más extraños, (2) el cyberpunk oscuro de megaciudad con neón y lluvia, y (3) la ciencia ficción de diseño gráfico brutalista, con colores ácidos y cuerpos sintéticos. **No uses nombres, personajes, criaturas, facciones, lugares ni logos de obras existentes.** Todo nombre y diseño debe ser propio.

### Premisa
En medio de una megaciudad sin cielo se abre **la Grieta**: un pozo vertical inmenso cuyo fondo nadie ha visto. De sus paredes salen artefactos imposibles, y las corporaciones de la ciudad pagan fortunas por ellos. **Cada jornada es una expedición nueva** que parte desde el borde. El héroe (un **Descensor**, explorador mitad humano y mitad sintético) baja con su equipo por los senderos, andamios y raíces que bordean las paredes del pozo. **Nunca se sube: solo se baja.** Al día siguiente, la Grieta "se reacomoda" y la ruta es otra (esto justifica en el mundo el reinicio diario y la semilla).

### Cómo encaja con el runner horizontal
- La vista es **lateral**: el héroe corre en horizontal por cornisas y pasarelas pegadas a la pared del abismo, y **cada tramo baja un poco**. En el fondo se ve el pozo con parallax de 3 o 4 capas: niebla, haces de luz que llegan desde arriba y se van apagando, y siluetas gigantes a lo lejos.
- La "distancia" del juego se mide como **profundidad en metros**, con un **medidor vertical** siempre visible en un costado. Los tramos de 500 m del documento equivalen a **tramos de descenso**; cada 10 tramos hay un **Umbral** (jefe) que da paso a la siguiente sección.
- La **"caravana"** del documento es la **Base Colgante**: empieza como un montacargas que baja detrás del héroe y crece hasta ser una ciudad suspendida de cables sobre el vacío.
- **Cuanto más hondo, menos luz.** La paleta va oscureciendo y la bioluminiscencia de las criaturas y el neón del equipo pasan a ser la luz principal.

### Las 3 corrientes estéticas (variantes de cada capa)
Cada capa del abismo existe en **3 variantes**. La Encrucijada de **Rumbo** decide cuál toca, así que el mismo tramo de horas se ve y se juega distinto cada día.

| Corriente | Sensación | Paleta | Criaturas / enemigos típicos | Recurso propio |
|---|---|---|---|---|
| **Neón** (cyberpunk oscuro) | Ciudad vertical podrida, lluvia, publicidad holográfica, corporaciones | Negro azulado, magenta, cian y ámbar de sodio | Drones de seguridad, chatarreros aumentados, perros mecánicos, enjambres de cables | **Créditos** |
| **Sintética** (diseño gráfico brutalista) | Megaestructuras antiguas impecables, señalética gigante, silencio, cuerpos de repuesto | Blanco hueso, gris hormigón, verde ácido, naranja de seguridad y negro puro | Centinelas geométricos, cuerpos vacíos reactivados, glitches con forma, constructos de luz | **Datos** |
| **Abismal** (maravilla natural) | Bosques que crecen hacia abajo, cascadas que caen al revés, ruinas cubiertas de musgo, belleza que mata | Verdes profundos, turquesa, dorado de luz filtrada, y luego violetas y bioluminiscencia | Bestias majestuosas, flores carnívoras, aves gigantes, criaturas casi divinas | **Esporas de luz** |

### Las capas (sustituyen a los nombres de era de la sección 5)
| Era | Capa | Profundidad | Neón | Sintética | Abismal |
|---|---|---|---|---|---|
| I | **El Brocal** | 0 – 1.000 m | Muelles de carga y mercado negro en el borde | Plataformas de medición abandonadas | Primeros jardines colgantes del borde |
| II | **Los Andamios** | 1.000 – 3.500 m | Favelas verticales y fábricas que gotean | Andamios de una construcción infinita | Nidos de aves en acantilados de niebla |
| III | **El Bosque Invertido** | 3.500 – 8.000 m | Bosque invadido por cables y granjas de datos | Árboles de cristal clonados en serie | Árboles gigantes que crecen hacia abajo, luz verde-dorada |
| IV | **La Necrópolis** | 8.000 – 15.000 m | Ciudad corporativa hundida, todavía encendida | Ciudad antigua perfecta, sin habitantes y vigilada | Ruinas fosilizadas de una civilización tragada por el abismo |
| V ∞ | **Lo Hondo** | 15.000 m → ∞ | Sub-capas procedurales: se genera una nueva cada 30–60 min con nombre propio, por ejemplo *"El Mar de Mercurio"*, *"La Catedral de Estática"*, *"El Jardín que Respira"*, *"La Zona Sin Gravedad"*, *"El Archivo de los Ahogados"* | | |

En Lo Hondo, el generador **mezcla corrientes** (por ejemplo, Neón + Abismal da "selva de neón orgánico"). Allí es donde el mundo se vuelve más raro e impredecible.

### Mecánica temática: la Presión
- A partir de la Era II existe la **Presión**, un valor que sube con la profundidad. La Presión alta reduce las estadísticas del grupo y **aumenta la probabilidad de Mutaciones**.
- Las **Mutaciones** son efectos aleatorios sobre el héroe o los compañeros. Pueden ser buenas (ojos que ven en la oscuridad: +crítico) o malas (piel de cristal: −defensa), y son visibles en el sprite.
- Algunos edificios de la Base (Cámara de Descompresión, Santuario) y algunos compañeros reducen la Presión. Algunos Pactos la convierten en poder: *"Pacto de la Hondura: la Presión aumenta tu daño en vez de reducirlo."*
- Sirve para que cada capa se sienta más **peligrosa y extraña**, no solo con números más grandes.

### Rango del Descensor (meta diaria visible)
Según la profundidad alcanzada en el día se obtiene un **rango** representado por una **placa** con un color: Óxido (inicio) → Cobre → Plata → Cobalto → Obsidiana → **Placa Blanca** (solo en Horas Extra). El rango del día aparece en la parte superior y queda guardado en la Crónica como récord, sin bonus.

### Artefactos (las Reliquias de la sección 6)
Son objetos encontrados en las paredes de la Grieta. Cada uno tiene una **corriente** (Neón, Sintética o Abismal), un **grado** (Común → Legendario) y una descripción breve con tono de catálogo de museo. Por ejemplo: *"Brújula Sin Norte — siempre apunta hacia abajo. Cada 10 tramos, desciende 3 de golpe."*

### Tono
**Maravilla + inquietud.** Lo bello y lo peligroso van juntos: una criatura hermosa puede ser la más letal. Los textos (eventos, presagios, cartas) son breves, poéticos y un poco melancólicos, nunca chistosos. Ejemplo de presagio: *"Hoy la Grieta suena como un órgano. Algo grande se mueve en la tercera capa."*

### Dirección de arte (para la fase de arte, NO implementar ahora)
- Pixel art de alta resolución o 2D vectorial plano, con siluetas muy legibles. La escala vertical es enorme: el héroe es pequeño frente al vacío.
- Placeholders actuales: cada corriente con su paleta de la tabla, criaturas como formas geométricas con el color de su corriente y un brillo para los modificadores.
- La interfaz usa tipografía grande, monoespaciada y de estilo técnico, con numeración tipo señalética ("CAPA 03 / TRAMO 041 / −6.420 M").

## 3. Tecnología

- **App de escritorio para Windows con Electron, que funciona como overlay** (ver 3.4). Por dentro es una web app **Vite + TypeScript + Canvas 2D**, sin backend ni librerías de motor pesadas, que también corre en el navegador para desarrollo.
- Se ejecuta con `npm install` y luego `npm run dev`. También debe funcionar `npm run build` (archivos estáticos).
- **Guardado en `localStorage`**: cada 30 s, al pausar, en `visibilitychange` y en `beforeunload`. El guardado lleva una versión de esquema.
- **Contenido como datos:** mundos, criaturas, compañeros, reliquias, eventos y cartas viven en `src/data/*.ts` como arrays de objetos tipados. Agregar contenido no debe requerir tocar la lógica.
- **RNG con semilla** (por ejemplo mulberry32 o sfc32). La semilla del día es `hash(fecha + nonce aleatorio guardado al crear el día)`. **Nunca** usar `Math.random()` en la lógica de juego.

### 3.1 Reloj y simulación (CRÍTICO)

El juego va a estar **en una pestaña de fondo** casi todo el tiempo. El navegador detiene `requestAnimationFrame` y limita los `setInterval` en pestañas ocultas (hasta 1 vez por minuto). Por eso:

- **La simulación está separada del render.** Se simula en pasos fijos (`TICK = 100 ms` de juego) a partir del tiempo real transcurrido (`Date.now()` / `performance.now()`), no contando frames.
- Un `setInterval(1000)` llama a `advance(realElapsed)`. Si la pestaña estuvo oculta y se acumularon minutos, se simulan todos los ticks pendientes de golpe (de forma eficiente; ver 3.2).
- `requestAnimationFrame` solo dibuja el último estado cuando la pestaña está visible.
- **Huecos grandes:** si entre dos llamadas pasaron más de **10 minutos** reales (PC suspendida, navegador congelado), ese hueco **no cuenta** como tiempo trabajado. Se registra en el log ("Pausa automática: el equipo estuvo dormido 42 min") y se considera que el juego estuvo en pausa. El umbral es configurable.
- **Tiempo trabajado del día** (`workedMs`): solo suma mientras el estado es `RUNNING`. Este es el reloj que controla las eras, las encrucijadas y los desbloqueos.

### 3.2 Simulación rápida

Cuando hay que simular mucho tiempo acumulado (al volver de una pestaña oculta), el combate debe aguantar 10 minutos de catch-up en menos de 1 segundo. Usa una simulación estadística por tramos (DPS contra HP, tasa de spawn y ganancias promedio) cuando el delta sea mayor de 60 s, y la simulación detallada por ticks cuando sea menor.

### 3.3 Modo debug

Con `?debug=1` en la URL aparece un panel con:
- Velocidad x1, x10, x60 y x600.
- Saltar a la hora X.
- Forzar una Encrucijada.
- Cambiar la semilla.
- Ver las fórmulas en vivo.
- Reiniciar el día.

Además, `npm run sim` ejecuta un **simulador headless** que juega un día de 8 h en segundos (eligiendo cartas al azar) y muestra la línea de tiempo: a qué hora se llegó a cada era, zona, jefe y moneda nueva. **Se usa para balancear.**

## 3.4 Aplicación de escritorio y OVERLAY (forma principal de uso)

El juego se distribuye como **ejecutable de Windows** hecho con **Electron** y `electron-builder`, que genera un instalador NSIS y una versión portable con `npm run dist`. El juego web (Vite + TS) va dentro sin cambios de lógica. En navegador sigue funcionando para desarrollo.

### Modo Overlay (por defecto)
El juego vive **superpuesto encima de las demás aplicaciones**, como una franja transparente:

- Ventana **sin bordes, con fondo transparente y siempre encima** (`frame:false, transparent:true, alwaysOnTop:true` con nivel `'screen-saver'` para que quede sobre otras ventanas, `skipTaskbar:true`, `focusable:false` cuando no se interactúa).
- **Click-through:** los clics atraviesan el juego y llegan a la aplicación de abajo (`setIgnoreMouseEvents(true, { forward: true })`). Solo los controles del overlay reciben clics: al pasar el mouse por el **botón Trabajar/Pausa**, el **asa de arrastre** o una **Encrucijada**, se desactiva el click-through y se vuelve a activar al salir.
- **Nunca roba el foco** del teclado ni interrumpe lo que se está escribiendo. La Encrucijada aparece sin tomar el foco.
- **Disposiciones** elegibles en ajustes:
  - **Franja inferior** (por defecto): ~110 px de alto, a lo ancho de la pantalla, pegada encima de la barra de tareas. Es el runner con el héroe corriendo.
  - **Franja superior.**
  - **Ventana flotante:** un recuadro pequeño (por ejemplo 420×240) que se arrastra a cualquier esquina.
  - **Mínimo:** solo una píldora con el reloj, el estado (▶/⏸) y la profundidad.
- **Tamaño ajustable:**
  - **Arrastrando el borde libre** de la franja: el superior si está abajo, el inferior si está arriba. Alto entre 60 y 300 px.
  - En la ventana flotante, **arrastrando cualquier esquina**.
  - **Tamaños predefinidos** en la bandeja y en ajustes: Delgada (70 px), Normal (110 px), Grande (180 px) y Cine (260 px).
  - **Ancho:** pantalla completa, mitad izquierda, mitad derecha o personalizado.
  - Atajos: `Ctrl+Alt+↑` / `Ctrl+Alt+↓` cambian de tamaño predefinido.
  - El arte y la interfaz **escalan proporcionalmente**; en tamaños chicos se ocultan los textos secundarios y solo quedan pausa, reloj y profundidad.
  - Se recuerdan el tamaño y la posición.
- **Opacidad ajustable** (20–100 %). Opción **"desvanecer al pasar el mouse"**: si el cursor se acerca, el overlay se vuelve casi transparente para dejar ver lo de abajo.
- **Multimonitor:** elegir en qué pantalla aparece. Se recuerdan la posición y el tamaño.
- **Ocultar automáticamente** cuando hay una aplicación en pantalla completa (videollamada en presentación, video, juego); vuelve al salir de ella. Es configurable.
- **Rendimiento:** el render del overlay está limitado a 30 FPS (configurable a 15) y el objetivo es menos del 2 % de CPU. Cuando el overlay está oculto no se renderiza, pero la simulación sigue. Hay que poner `backgroundThrottling:false` en la ventana para que el tiempo nunca se frene.

### Panel completo
- Una segunda ventana normal con la interfaz completa de la sección 9: Base, grupo, sinergias, log, Crónica y ajustes. Se abre con atajo, desde la bandeja o con doble clic en el overlay.
- La simulación vive en **un solo lugar** (el proceso principal o una ventana oculta) y ambas ventanas solo **muestran** el estado mediante IPC. Abrir o cerrar ventanas no afecta al juego.

### Encrucijadas en modo overlay
- Cuando llega una, el overlay muestra un **aviso pulsante** pequeño ("⚠ Encrucijada") y suena un sonido suave. Además aparece una **notificación nativa de Windows**.
- Al hacer clic en el aviso, las 3 cartas se despliegan **encima de la franja**. Se elige con un clic y la franja vuelve a su tamaño.

### Bandeja del sistema y atajos globales
- **Ícono en la bandeja** (junto al reloj de Windows), con un ícono distinto para ▶ y ⏸. Menú: Trabajar/Pausa · Mostrar/Ocultar overlay · Cambiar disposición · Abrir panel completo · Ajustes · Salir.
- **Atajos globales** (`globalShortcut`), configurables:
  - `Ctrl+Alt+Espacio`: Trabajar/Pausa.
  - `Ctrl+Alt+O`: mostrar/ocultar el overlay.
  - `Ctrl+Alt+J`: abrir el panel completo.
  - `Ctrl+Alt+E`: abrir la Encrucijada pendiente.

### Arranque y guardado
- Opción **"Iniciar con Windows"** (`app.setLoginItemSettings`). Siempre arranca **en pausa**.
- **Una sola instancia** (`requestSingleInstanceLock`).
- **Guardado en archivo JSON** dentro de `app.getPath('userData')`, con escritura atómica (archivo temporal y luego renombrar) y 3 copias de respaldo rotativas. Sustituye a `localStorage` en la versión de escritorio (abstraer con una interfaz `SaveStore`).
- Detección de **suspensión de la PC**: el evento `powerMonitor` `suspend`/`resume` complementa la regla de huecos de la sección 3.1. Al suspender se pausa la simulación y al volver el juego sigue en el mismo estado en que estaba.
- **Opcional:** pausa automática si el sistema detecta inactividad (`powerMonitor.getSystemIdleTime()`) durante más de X minutos (por defecto desactivada; configurable entre 5 y 30 min). Muestra el aviso "Te fuiste, pausé la jornada".

## 4. Ciclo de un día

```
[Abrir juego] → ¿Es un día nuevo? → sí → Pantalla "Nueva Jornada" → Encrucijada de Origen → RUNNING
                                   → no → Restaurar estado (en PAUSA) → el usuario pulsa Trabajar
RUNNING ⇄ PAUSED (botón grande)
Cambio de día (hora de corte) → Resumen "Crónica del día" → se archiva → nueva jornada
```

- **Hora de corte configurable** (por defecto **04:00 local**), para que trabajar pasada la medianoche no corte la partida.
- Al detectar un día nuevo, se muestra el **resumen del día anterior** antes de empezar el nuevo.
- Botón opcional "Terminar jornada", que cierra el día manualmente (con confirmación).
- **Al abrir, el juego siempre arranca en PAUSA.** El usuario decide cuándo empieza a trabajar.

## 5. Estructura de la jornada (línea de tiempo)

Todos los tiempos son **horas trabajadas del día** (`workedMs`), no horas de reloj.

| Tiempo trabajado | Era / hito | Qué aparece por primera vez |
|---|---|---|
| 0:00 | **Encrucijada de Origen** | Corriente inicial y chasis del Descensor |
| 0:00 – 1:00 | **Era I · El Brocal** | El héroe solo con 1 familia de criaturas. A los 15 min aparece la 2.ª familia; a los 30 min, el primer **Umbral** (jefe) y la moneda de la corriente; a los 45 min, el **montacargas** (Base nivel 1) |
| ~1:00–1:45 | **Encrucijada 2 · Compañero** | Primer compañero |
| 1:00 – 2:00 | **Era II · Los Andamios** | Primeros módulos automáticos de la Base, **materiales** y la **Presión**. Eventos menores |
| ~2:15–3:00 | **Encrucijada 3 · Rumbo** | Elige la corriente (Neón / Sintética / Abismal) del Bosque Invertido |
| 2:00 – 3:30 | **Era III · El Bosque Invertido** | **Talleres** que fabrican equipo, **mascotas**, **Mutaciones** y el recurso **esencia** |
| ~3:30–4:15 | **Encrucijada 4 · Pacto** | Una regla fuerte con coste (cambia cómo funciona la partida) |
| 3:30 – 5:00 | **Era IV · La Necrópolis** | **Eventos de capa** (apagones, migraciones, despertares), **Umbrales mayores** y un 2.º compañero activo |
| 5:00 | **Cofre de Jornada + Encrucijada 5 · Destino** | Cartas raras y extrañas. Gran evento visual: el suelo se abre hacia Lo Hondo |
| 5:00 + | **Era V · Lo Hondo (∞)** | Sub-capas procedurales, **Anomalías** y criaturas mezcladas entre corrientes. Una **Encrucijada cada 60–90 min** sin fin y el recurso **fragmentos de vacío**. La escala sigue creciendo sin límite |

**Reglas de calendario:**
- La hora exacta de cada Encrucijada se calcula con la semilla del día **dentro de su ventana**. El usuario ve "Próxima encrucijada en ~XX min" (aproximado, para mantener la intriga).
- Las eras se desbloquean **por tiempo trabajado y por progreso**: requieren `workedMs ≥ umbral` **y** haber derrotado al jefe de la era. Si el héroe está atascado, el jefe recibe un debuff progresivo para que nunca se bloquee la jornada.
- **El arranque lento es intencional.** En los primeros 15 minutos casi no hay nada que mirar más allá de correr y pelear. Cada aparición nueva se anuncia con un pequeño banner ("¡Algo nuevo apareció: …!").

## 6. Las Encrucijadas (el corazón de la variedad)

### 6.1 Funcionamiento

- Cuando llega la hora, aparece un **modal con 3 cartas**. Suena un aviso (opcional) y aparece una notificación del sistema (Notification API, con permiso pedido una sola vez en ajustes).
- **El juego NO se detiene.** La caravana "acampa": el héroe sigue peleando y ganando en la zona actual, pero no avanza de zona hasta que se elige.
- Si pasan **20 minutos trabajados** sin elegir, el **Destino elige al azar** (configurable entre 10 y 60 min o desactivado). Así el usuario no pierde tiempo si está concentrado.
- Las 3 cartas siempre son **distintas entre sí**: diferente subtipo y, cuando se pueda, una "segura", una "equilibrada" y una "arriesgada".
- Cada carta muestra: nombre, ilustración placeholder, efecto visible, etiquetas de sinergia y, a veces, una línea **"???"** con un efecto oculto que se revela al elegirla (como máximo 1 carta de las 3 lo tiene).

### 6.2 Tipos de Encrucijada y ejemplos de cartas

**A) Origen (0:00): punto de entrada + chasis del Descensor.** Define la corriente de la Era I, las familias de criaturas iniciales y la habilidad del héroe. Las 3 cartas son siempre de **corrientes distintas**.
- *Muelle 9, bajo la lluvia · Chasis Sabueso* (Neón): criaturas Mecánico/Sombra; el héroe dispara ráfagas a distancia.
- *Estación de Medición Cero · Chasis Monolito* (Sintética): criaturas Cristal/Arcano; el héroe es tanque y refleja daño.
- *Jardín Colgante del Borde · Chasis Raíz* (Abismal): criaturas Bestia/Veneno; el héroe se cura al matar.
- *Mercado Negro del Brocal · Chasis Ganzúa* (Neón): probabilidad de doble botín y robo a los Umbrales.
- *(mínimo 8 puntos de entrada, al menos 2 por corriente, y 6 chasis; la carta combina ambos)*

**B) Compañero.** Se une al grupo con rol, rasgo y etiquetas.
- *Grom, el Herrero Errante* [Tanque, Fuego]: absorbe golpes y mejora el equipo de la caravana.
- *Lysa, Sanadora del Alba* [Soporte, Sagrado]: cura y revive al héroe una vez por jefe.
- *Pip, Ladrón Goblin* [Recolector, Sombra]: +40 % de oro y roba objetos a los jefes.
- *(mínimo 16 compañeros; cada uno tiene una **misión personal** que se cumple sola y lo evoluciona a una versión superior más tarde en el día)*

**C) Rumbo.** Elige la variante de corriente de la siguiente capa. Cada carta es una ruta concreta de descenso.
- *Seguir los cables de la corporación* (Neón): drones y chatarreros; más créditos; mercaderes ilegales.
- *Entrar por la escotilla sellada* (Sintética): centinelas geométricos muy resistentes; artefactos de grado alto.
- *Bajar por las raíces del árbol madre* (Abismal): bestias que se multiplican; más esencia; la Presión sube más rápido.
- *Saltar a la oscuridad sin mapa:* corriente aleatoria **???** con bonus de rareza.

**D) Pacto.** Regla poderosa con coste.
- *Pacto de Sangre:* +100 % de daño, pero la caravana produce un 30 % menos.
- *Pacto del Mercader:* desbloquea mercaderes en cada zona; los jefes no sueltan objetos.
- *Pacto del Enjambre:* aparecen el triple de criaturas con un tercio de la vida; nueva familia de criaturas.

**E) Destino / Horas Extra.** Cartas extrañas, de alto impacto o que **rompen reglas**.
- *Portal al Revés:* el héroe corre hacia la izquierda y el mundo se espeja con criaturas "reflejo".
- *El Dragón Dormido:* aparece un jefe colosal que se combate durante 1 hora completa.
- *Segunda Caravana:* un clon de la caravana con otra especialidad.

**F) Reliquias (mezcladas en cualquier Encrucijada desde la Era II).** Objetos únicos con efectos condicionales:
- *Brújula Rota:* cada 10 zonas, salta 3 zonas.
- *Corona de Espinas:* el héroe recibe más daño, pero cada golpe recibido da oro.
- *(mínimo 30 reliquias)*

### 6.3 Sinergias (qué hace que las decisiones importen)

Etiquetas: **Fuego, Hielo, Veneno, Sagrado, Sombra, Mecánico, Bestia, Arcano, Marino, Cristal.**
- 2 elementos con la misma etiqueta (entre héroe, compañeros, reliquias y pacto) dan un bono pasivo pequeño.
- 3 elementos dan un **efecto visible nuevo** (por ejemplo, con Fuego x3 los enemigos explotan al morir).
- 4 o más dan una **transformación** (por ejemplo, con Sombra x4 el héroe cambia de forma y gana una habilidad nueva).
- Además existen **combos secretos** entre etiquetas concretas (por ejemplo, Hielo + Fuego da "Vapor"). Cuando se descubren por primera vez quedan registrados en la Crónica.
- El panel de sinergias muestra las activas y la cuenta de cada etiqueta ("Fuego 2/3"). Así el usuario puede **planear** al elegir cartas.

### 6.4 Generación de opciones

```
generarEncrucijada(tipo, estado, rng):
  pool = cartas del tipo + reliquias (si la era ≥ II), excluyendo las ya obtenidas hoy
  peso(carta) = rarezaBase × (1.5 si comparte etiqueta con la build actual) × (1.3 si es nueva en la Crónica)
  elegir 3 sin repetir subtipo; garantizar al menos 1 carta "nueva en la Crónica" si existe
  rareza: Común 60 % / Rara 28 % / Épica 10 % / Legendaria 2 % (en Horas Extra: 35/35/22/8)
```

## 7. Mecánicas automáticas

### 7.1 Héroe y combate
- El héroe corre hacia la derecha a una velocidad fija. El mundo se divide en **zonas de 500 m**.
- Cuando una criatura entra en rango, el héroe se detiene y pelea; el combate es automático según sus estadísticas.
- Estadísticas: `vida, ataque, velocidadAtaque, crítico, dañoCrítico, defensa, regeneración, alcance`.
- **Jefe cada 10 zonas.** Si el héroe muere, reaparece al inicio de la zona tras 5 s (sin perder recursos). Si muere 3 veces contra el mismo jefe, vuelve a "farmear" las 2 zonas anteriores durante unos minutos y reintenta. Así se generan "muros" que las mejoras rompen, lo que resulta satisfactorio de ver.
- Habilidades del héroe (2 o 3 según el arquetipo) se lanzan solas cuando terminan su tiempo de recarga.

### 7.2 Criaturas procedurales
Cada criatura = **familia** + **0–3 modificadores** + **escala por zona**.
- Familias (mínimo 12, **4 por corriente**, todas originales):
  - **Neón:** Dron Sabueso, Chatarrero Aumentado, Enjambre de Cables, Perro de Chapa.
  - **Sintética:** Centinela Prisma, Cuerpo Vacío, Glitch Errante, Constructo de Luz.
  - **Abismal:** Polilla de Ceniza, Lirio Dentado, Garza del Vacío, Cangrejo Relicario.
  - Lo Hondo genera **híbridos entre corrientes** (por ejemplo, "Polilla de Chapa", "Centinela Dentado").
- Modificadores (mínimo 25): *Gigante, Veloz, Venenoso, Acorazado, Explosivo, Cristalino, Regenerador, Divisor (al morir se parte en 2), Dorado (mucho oro, huye), Ancestral, Mutado…*
- El número de modificadores sube con las zonas y las eras. En Horas Extra aparecen **modificadores de Anomalía** exclusivos.
- Nombre generado: "Escarabajo Venenoso Gigante".
- **Bestiario del día:** cada combinación nueva se registra. El contador "Criaturas descubiertas hoy: 37" es una pequeña meta visible.

### 7.3 Economía (una moneda nueva por era)
| Moneda | Desde | Fuente | Uso |
|---|---|---|---|
| Créditos / Datos / Esporas de luz | Era I | Criaturas (según la corriente activa) | Mejoras del héroe. **Internamente es una sola moneda ("oro") que cambia de nombre e ícono según la corriente** |
| Materiales | Era II | Base y criaturas | Módulos de la Base |
| Esencia | Era III | Umbrales y talleres | Equipo, mascotas, evolución de compañeros |
| Ecos | Era IV | Eventos de capa | Mejoras de la Necrópolis (multiplicadores globales) |
| Fragmentos de Vacío | Era V | Anomalías | Mejoras infinitas de Lo Hondo |

### 7.4 IA de decisiones (sustituye al jugador)
- **Compras:** cada 2 s compra la mejora con mejor `valorEstimado / coste` que pueda pagar, guardando un pequeño margen para el próximo edificio clave.
- **Equipo:** equipa automáticamente si el `puntajePoder` es mayor.
- **Edificios:** sigue una lista de prioridades según la era y la build (si la build es de Fuego, prioriza la Fragua).
- **Panel opcional de "Prioridades de la IA"** (Ofensiva / Defensiva / Economía). No es obligatorio tocarlo.

### 7.5 Caravana → Campamento → Aldea → Reino
- Se ve como una tira debajo del runner (o en un panel lateral) que **crece visualmente**.
- Los edificios se construyen solos. Cada uno da producción pasiva o desbloquea una mecánica: Fragua → equipo; Taberna → los compañeros suben de nivel; Templo → bendiciones aleatorias cada 30 min; Mercado → mercaderes; Torre de Vigía → anuncia eventos; Biblioteca → reliquias más raras.
- **Mínimo 15 edificios**, cada uno con 5 o más niveles.

### 7.6 Eventos automáticos (sorpresas pequeñas)
Cada 8–20 min trabajados (según la semilla) ocurre un evento sin intervención del usuario:
- Mercader ambulante (compra sola), cofre misterioso, criatura dorada que huye, lluvia de meteoritos, clima (niebla, tormenta, luna de sangre) con modificadores, jefe errante, festival en la aldea, carrera contra un rival, visitante que ofrece una reliquia menor…
- **Eventos mundiales** (Era IV en adelante) de 10–15 min: invasión, eclipse, migración de criaturas.
- **Rarezas:** eventos con probabilidad de alrededor del 2 % por día (por ejemplo, "El Tren Fantasma"). Se registran en la Crónica como "vistos X veces".
- **El catálogo completo** (70 eventos, 10 rarezas, 10 cadenas y 12 condiciones del día) está en `EVENTOS_Y_RUTA.md`.

## 8. Balance y ritmo

- **Crecimiento base por zona** `z`:
  - Vida de criatura: `10 × 1.11^z × multEra`.
  - Oro por criatura: `1 × 1.09^z`.
  - Coste de mejora nivel `n`: `base × 1.15^n`.
- **Objetivos para el simulador** (con elecciones aleatorias): jefe de la Era I hacia los 45–55 min, Era II hacia 1:05–1:20, Era III hacia 2:10–2:30, Era IV hacia 3:40–4:00 y Era V justo a las 5:00.
- **Nunca debe haber más de 12 minutos seguidos sin "algo nuevo"** (un evento, una criatura nueva, un edificio, una carta o una sinergia). El simulador debe informarlo como "mayor hueco sin novedades".
- En Horas Extra la escala usa una exponencial suavizada que nunca llega a un límite, y cada 30 min aparece al menos 1 modificador o anomalía nueva.
- Números grandes: usa formato abreviado (K, M, B, T, aa, ab…) y `break_infinity.js` o un decimal propio cuando se pase de 1e300.

## 9. Interfaz

```
┌───────────────────────────────────────────────────────────────┐
│ [▶ TRABAJAR / ⏸ PAUSA]  Hoy: 3h 42m  CAPA 03 · Bosque Invertido│
│ Próxima encrucijada: ~25 min   Placa: Plata   −6.420 M        │
├─────────────────────────────────────────────────────────────┬─┤
│                                                             │▼│
│   RUNNER (canvas, vista lateral de la pared del abismo)     │ │
│   héroe, compañeros, criaturas, parallax del vacío          │ │ ← medidor
├─────────────────────────────────────────────────────────────┴─┤   de profundidad
│ BASE COLGANTE (crece colgada de cables)                       │
├───────────────┬──────────────────┬────────────────────────────┤
│ Grupo y build │ Sinergias activas│ Registro de eventos (log)  │
└───────────────┴──────────────────┴────────────────────────────┘
```

- El **botón Trabajar/Pausa** es enorme y siempre visible. Atajo: barra espaciadora.
- **El reloj "Hoy: 3h 42m" sirve también como contador real de horas trabajadas.**
- El título de la pestaña muestra el estado: `▶ 3:42 · La Jornada` o `⏸ 3:42 · La Jornada`, además de `⚠ ¡Encrucijada!` cuando hay una pendiente.
- **Este esquema es el panel completo.** El uso diario es el **overlay** de la sección 3.4: una franja transparente con el runner, el botón Trabajar/Pausa, el reloj, la profundidad y el aviso de Encrucijada.
- Toda la interfaz está en español.

## 10. Guardado

```ts
SaveData {
  version: number
  current: DayState | null        // la partida de hoy
  chronicle: ChronicleEntry[]     // historial informativo (sin efecto en el juego)
  settings: Settings              // hora de corte, sonido, notificaciones, auto-elegir, umbral de hueco
}
DayState { dateKey, seed, workedMs, status, era, zone, hero, party, caravan,
           currencies, relics, pact, synergies, pendingCrossroads, scheduledCrossroads,
           bestiary, eventLog, lastTickRealTime }
```

## 11. Pantalla "Nueva Jornada"
- Muestra: "Día 23 · Nueva jornada", la semilla visible y un **presagio del día** (frase aleatoria que da una pista vaga de lo que viene, por ejemplo "Hoy los cuervos vuelan hacia el este…"). Luego se muestra la Encrucijada de Origen.

## 12. Crónica (historial sin poder)
- Al cerrar el día se guarda: fecha, horas trabajadas, era máxima, zona máxima, cartas elegidas, compañeros, sinergias logradas, combos secretos descubiertos, rarezas vistas y criaturas únicas.
- Pantalla de Crónica con: lista de días, **gráfico de horas trabajadas por día** y racha de días.
- **Récords personales** (zona máxima, horas en un día) como metas personales. **No dan ningún bonus.**
- Indicadores "Nuevo en la Crónica" en las cartas, para motivar a probar cosas distintas.

## 13. Fuera de alcance (por ahora)
- Arte final, música y sonido final (usa sonidos simples o WebAudio con beeps).
- Cuentas de usuario, nube y multijugador.
- Monetización.

## 14. Fases de implementación

**Fase 1 — Núcleo**
- Proyecto Vite+TS, bucle de simulación por tiempo real, render en canvas, héroe que corre y pelea con 2 familias de criaturas, oro y mejoras automáticas.
- Botón Trabajar/Pausa, reloj del día, guardado/carga, reinicio diario con hora de corte y detección de huecos.
- Panel debug y `npm run sim`.
- ✅ *Aceptación:* con x600 se juega 1 hora en 6 s. Al recargar la página el estado se conserva y arranca en pausa. Al cambiar la fecha (debug) se crea un día nuevo. Con la pestaña oculta 5 min y luego visible, el progreso es coherente.

**Fase 1.5 — Escritorio y overlay**
- Carcasa Electron, overlay transparente con click-through, las 4 disposiciones, bandeja del sistema, atajos globales, guardado en archivo, `powerMonitor`, inicio con Windows y `npm run dist` (instalador + portable).
- ✅ *Aceptación:*
  - Con el overlay activo se puede escribir y hacer clic en otras aplicaciones sin interferencia.
  - El botón de pausa del overlay y el atajo global funcionan.
  - Minimizado u oculto durante 10 min, el tiempo trabajado avanza correctamente.
  - Al suspender la PC, ese tiempo no cuenta.
  - El .exe portable arranca con doble clic.

**Fase 2 — Encrucijadas y compañeros**
- Sistema de Encrucijadas con calendario por semilla, modal, auto-elegir tras 20 min y notificaciones.
- Pools de Origen, Compañero y Rumbo, y el sistema de etiquetas y sinergias.
- ✅ *Aceptación:* dos días con semillas distintas muestran cartas distintas. Las sinergias de 2 y 3 elementos se activan y se ven en el panel.

**Fase 3 — Eras, caravana y economía**
- Las 5 eras, las monedas por era, la caravana/aldea con 15 edificios, los oficios, las mascotas y los Pactos.
- ✅ *Aceptación:* el simulador cumple los objetivos de tiempo de la sección 8 (±15 %).

**Fase 4 — Variedad infinita**
- Criaturas procedurales completas (familias + modificadores), catálogo de eventos, cadenas, condiciones del día, eventos de capa, rarezas, sub-capas de Lo Hondo hasta las 16 h, Ciclos Invertidos infinitos, cartas de Destino y combos secretos (ver `EVENTOS_Y_RUTA.md`).
- ✅ *Aceptación:* el simulador informa un "mayor hueco sin novedades" de ≤ 12 min en un día de 8 h. Las Horas Extra siguen generando contenido nuevo hasta la hora 12.

**Fase 5 — Pulido**
- Crónica con gráfico, presagio del día, banners de "¡algo nuevo!" en el overlay, aviso de Encrucijada pulsante, desvanecer al pasar el mouse, ocultar en pantalla completa, pausa por inactividad y ajustes.
- ✅ *Aceptación:* recorrido completo de un día simulado sin errores en consola.

## 15. Cantidades mínimas de contenido (para que no se repita)

| Contenido | Mínimo |
|---|---|
| Puntos de entrada (Origen) | 8 (mín. 2 por corriente) |
| Chasis de Descensor | 6 |
| Variantes de capa (4 capas × 3 corrientes) | 12 |
| Plantillas de sub-capa de Lo Hondo | 15 |
| Mutaciones | 20 |
| Compañeros (con evolución) | 16 |
| Regiones de Rumbo | 12 |
| Pactos | 10 |
| Cartas de Destino / Horas Extra | 12 |
| Reliquias | 30 |
| Familias de criaturas | 12 |
| Modificadores de criaturas | 25 (+8 de Anomalía) |
| Edificios | 15 |
| Eventos | 70 (incluye 10 rarezas), ver `EVENTOS_Y_RUTA.md` |
| Cadenas de varias partes | 10 |
| Condiciones del día | 12 |
| Sub-capas con nombre de Lo Hondo (5 h – 16 h) | 11 + generador infinito |
| Combos secretos de sinergia | 10 |

Organiza los datos para que ampliar cada lista sea solo agregar objetos.
