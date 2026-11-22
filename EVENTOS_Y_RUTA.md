# LA JORNADA — Ruta de juego (16 h +) y catálogo de eventos

> **Para Fable:** este documento complementa `DISENO_JUEGO.md` y tiene prioridad sobre él en lo relativo a la línea de tiempo y a los eventos. Todo lo que aparece aquí se implementa **como datos** (`src/data/route.ts`, `src/data/events.ts`, `src/data/chains.ts`, `src/data/dayConditions.ts`). Los tiempos son **horas trabajadas del día**.

---

## 1. Cómo se combinan las capas de sorpresa

Cada día se juega la misma **ruta** (el "esqueleto" de hitos), pero casi todo lo que la rellena cambia:

1. **Ruta fija de hitos** (sección 3): da la emoción de *"¿qué hay en la hora 7?"*. Cada hito tiene **3 variantes**, una por corriente (Neón / Sintética / Abismal), según la corriente activa.
2. **Condición del día** (sección 2): un modificador global aleatorio que se anuncia al empezar.
3. **Cadenas** (sección 5): 2–3 historias de varias partes por día, que se resuelven horas después.
4. **Eventos aleatorios** (sección 4): cada 8–20 min, según la era, la corriente y los pesos.
5. **Rarezas** (sección 4.7): menos del 2 % por día cada una. Son las que se recuerdan.
6. **Encrucijadas** (en el documento principal): cambian la build y la corriente.

**Densidad objetivo por hora:** 1 hito fijo como mínimo + 3–6 eventos aleatorios + 0–1 parte de cadena. Nunca más de 12 min sin novedad.

---

## 2. Condiciones del día (1 al azar por día, se anuncia en la pantalla "Nueva Jornada")

| Condición | Efecto global |
|---|---|
| **Día de Lluvia Larga** | Eventos de clima x2. Las criaturas Neón son más comunes |
| **Día de Mercaderes** | Los mercaderes aparecen el triple de veces; las monedas valen menos |
| **Día del Eco** | Cada Umbral derrotado reaparece como fantasma aliado durante 5 min |
| **Día Silencioso** | Hay pocos eventos, pero cada uno es de rareza superior |
| **Día de Corrientes Cruzadas** | Desde la Era I aparecen criaturas híbridas entre corrientes |
| **Día Pesado** | La Presión sube el doble, igual que la probabilidad de Mutaciones |
| **Día de Viento Ascendente** | El héroe corre más rápido, pero los Umbrales tienen +30 % de vida |
| **Día Generoso** | Las Encrucijadas ofrecen 4 cartas en vez de 3 |
| **Día de los Gemelos** | Cada compañero llega con una copia débil de sí mismo |
| **Día Sin Mapa** | Las Encrucijadas de Rumbo son todas **???** |
| **Día de la Fiesta Abajo** | La Base celebra cada hora: +producción y banners festivos |
| **Día Normal** | Sin modificador (probabilidad alta, alrededor del 30 %, para que los demás se sientan especiales) |

---

## 3. Ruta de la jornada, hora por hora

Leyenda: ⚑ hito fijo · ✦ Encrucijada · ☠ Umbral (jefe) · ✚ sistema nuevo. Los Umbrales tienen un nombre por corriente con el formato `Neón / Sintética / Abismal`.

### Superficie y primeras capas

| Tiempo | Qué pasa |
|---|---|
| 0:00 | ✦ **Origen**. Presagio del día. El héroe salta al vacío desde el borde (animación de inicio) |
| 0:05 | ⚑ Primera criatura. Banner: "Comienza el descenso" |
| 0:15 | ✚ 2.ª familia de criaturas |
| 0:20 | ⚑ Primer evento aleatorio garantizado (de la lista de **Encuentros**) |
| 0:30 | ☠ **El Portero** — *Grúa de Seguridad / Torre de Medición / Garza Anciana*. ✚ Moneda de la corriente |
| 0:45 | ✚ **Montacargas**: nace la Base Colgante |
| ~1:00 | ✦ **Compañero**. Era II · **Los Andamios**. ✚ Materiales y módulos de la Base |
| 1:10 | ✚ **Presión** (medidor visible). Banner: "El aire se vuelve espeso" |
| 1:30 | ⚑ Se activa la **parte 1 de la Cadena A** del día |
| 1:45 | ☠ **La Grúa Viva** — *Excavadora Poseída / Andamio Consciente / Nido-Madre* |
| 2:00 | Era III · **El Bosque Invertido**. ✚ Talleres y equipo fabricado |
| ~2:30 | ✦ **Rumbo** (elige la corriente del Bosque) |
| 2:45 | ✚ **Mutaciones**. La primera es garantizada y positiva |
| 3:00 | ✚ **Mascotas** (nace la primera). ⚑ **Parte 1 de la Cadena B** |
| 3:20 | ☠ **El Corazón del Bosque** — *Servidor Raíz / Prisma Madre / Árbol Madre* |
| 3:30 | Era IV · **La Necrópolis**. ✚ Eventos de capa |
| ~3:45 | ✦ **Pacto** |
| 4:00 | ⚑ Primer **Evento de Capa** garantizado (10–15 min) |
| 4:30 | ✚ 2.º compañero activo. ⚑ **Parte 2 de la Cadena A** |
| 4:50 | ☠ **El Guardián** — *CEO Fantasma en su exoesqueleto / Arquitecto Final / Coloso Fosilizado* |
| 5:00 | ✦ **Destino** + 🎁 **Cofre de Jornada**. ⚑ **El suelo se abre**: cinemática y entrada a Lo Hondo |

### Lo Hondo (5 h – 16 h): una sub-capa con nombre por hora

Cada sub-capa trae **una mecánica propia** que cambia cómo se ve y se juega esa hora. A partir de aquí hay una ✦ Encrucijada cada 60–90 min.

| Hora | Sub-capa | Mecánica nueva | Hito / Umbral |
|---|---|---|---|
| 5 – 6 | **El Mar de Mercurio** | **Reflejos:** cada criatura tiene un clon invertido bajo el suelo espejo, y matar al original elimina al reflejo | ☠ *La Reina del Reflejo* (5:50) |
| 6 – 7 | **La Catedral de Estática** | **Carga:** los golpes acumulan electricidad que explota cada 10 golpes; se ven rayos | ⚑ 6:30 Un órgano gigante suena: todos los enemigos bailan 1 min sin atacar |
| 7 – 8 | **El Jardín que Respira** | **Respiración:** el terreno se expande y se contrae cada 30 s, alternando fases rápidas y lentas | ⚑ 7:30 **El Primer Fondo**: parece el final… y el suelo se rompe. Banner: "No era el fondo" |
| 8 – 9 | **La Zona Sin Gravedad** | **Flotación:** las criaturas llegan desde arriba y desde abajo, y el héroe pelea girando | ☠ *El Satélite Hundido* (8:50). ⚑ **Parte 3 / final de la Cadena A** |
| 9 – 10 | **El Archivo de los Ahogados** | **Recuerdos:** moneda menor que desbloquea fragmentos de *lore* en la Crónica (solo texto) | ⚑ 9:30 Se lee un fragmento que explica qué es la Grieta (parte 1 de 3) |
| 10 – 11 | **La Fábrica de Capas** | **Ensamblaje:** se ven capas anteriores siendo construidas; mezcla de las 3 corrientes; criaturas a medio terminar | ⚑ 10:00 **Placa Blanca** (rango máximo normal). ☠ *El Capataz* (10:50) |
| 11 – 12 | **Los Huesos del Gigante** | **Escalada:** se corre por dentro de un esqueleto colosal y las costillas actúan como puertas cada 5 tramos | ⚑ 11:30 Lore, parte 2 |
| 12 – 13 | **La Ciudad Original** | **Déjà vu:** aparece la megaciudad de arriba, pero antigua e intacta, y sus criaturas son versiones antiguas de las de la Era I | ☠ 12:00 **Duelo final contra el Rival** (si la Cadena "El Rival" está activa; si no, *El Alcalde de Polvo*) |
| 13 – 14 | **El Latido** | **Pulso:** cada 10 s llega un latido que da +daño durante 2 s; el fondo de la pantalla late | ⚑ 13:30 Lore, parte 3: revelación final |
| 14 – 15 | **La Frontera de Ruido** | **Glitch:** colores invertidos, la UI se deforma con un efecto visual y los nombres de criaturas aparecen corruptos | ☠ *Lo Que Escribe el Mundo* (14:50) |
| 15 – 16 | **El Fondo** | **Calma:** sin criaturas los primeros 5 min; solo luz y silencio | ⚑ **15:30 GRAN HITO: el fondo es un cielo.** El héroe cae a través de él hacia otro cielo. Cinemática. Placa **Sin Nombre** |
| 16 + | **Ciclos Invertidos (∞)** | Todo se ve "al revés": el héroe cae hacia arriba en un mundo invertido. Desde aquí, cada hora se genera una sub-capa procedural combinando 2 mecánicas de las anteriores + 1 modificador de Anomalía + una paleta mezclada | Un Umbral procedural por hora y una Encrucijada cada 60 min. Cada ciclo de 4 h sube el **Grado de Ciclo** (I, II, III…), que sirve como récord en la Crónica |

> **Nota de ritmo:** lo normal será ver hasta la hora 5–8 en la mayoría de los días. Las horas 9–16 son el "contenido legendario" de los días largos. La Crónica muestra el **hito más profundo alcanzado** y deja con llave 🔒 los que no se han visto, para crear curiosidad.

---

## 4. Catálogo de eventos aleatorios

**Formato de datos:**

```ts
EventDef { id, nombre, categoria, corriente: 'N'|'S'|'A'|'*', eraMin, peso, duracionMin, unaVezPorDia, efecto, textoLog }
```

**Selección:** cada 8–20 min se elige uno por peso entre los elegibles (por era y corriente). No se repite un evento hasta que hayan pasado al menos 5 eventos distintos; los marcados ★ salen una sola vez por día.

### 4.1 Encuentros
| Evento | Corr. | Desde | Efecto |
|---|---|---|---|
| Mercader de Paraguas | N | I | Vende una mejora a mitad de precio (la IA compra) |
| Descensor Perdido | * | I | Se une como compañero temporal durante 10 min |
| Criatura Dorada | * | I | Huye corriendo; si muere da x20 moneda |
| La Niña del Farol | A | II | Ilumina el camino: +15 % crítico durante 10 min |
| Cuerpo de Repuesto | S | II | El héroe cambia de cuerpo: re-tira 1 estadística con +10 % |
| Predicador del Borde | N | II | Bendición o maldición al azar durante 15 min |
| Expedición Rival | * | II | Carrera de 5 min; si se gana, da un Artefacto |
| Eco de un Descensor Caído ★ | * | III | Un fantasma pelea a tu lado y deja su placa en la Crónica |
| El Coleccionista sin Rostro | S | III | Cambia tu peor Artefacto por uno de grado superior |
| Manada Migratoria | A | III | 3 min sin combate: el héroe corre sobre las bestias con +300 % de velocidad |
| Contrabandista de Recuerdos | N | III | Revela la carta **???** de la próxima Encrucijada |
| El Gigante Dormido ★ | A | IV | El camino pasa sobre su cuerpo; 30 % de que despierte (Umbral especial) |
| La Archivista | S | IV | Revela 1 combo secreto de sinergia |
| Vendedor de Mapas Falsos | N | II | 50 %: atajo de 5 tramos / 50 %: desvío con criaturas extra |
| Ermitaño de la Pared | A | III | Enseña una habilidad temporal al héroe durante 20 min |

### 4.2 Clima y capa
| Evento | Corr. | Desde | Efecto |
|---|---|---|---|
| Lluvia Ácida | N | I | −20 % de defensa para todos durante 8 min |
| Niebla Viva | A | I | Las criaturas aparecen de golpe; +botín |
| Apagón | N | II | Oscuridad total: solo se ven ojos y neón; criaturas Sombra +50 % |
| Lluvia Ascendente | A | II | Las gotas suben; +regeneración |
| Corte de Señal | S | II | Habilidades bloqueadas 2 min y luego **sobrecarga** x2 durante 2 min |
| Tormenta de Esporas | A | III | +50 % esencia y +Presión |
| Silencio Absoluto | S | III | Las criaturas son invisibles hasta que golpean (efecto visual) |
| Eclipse de Neón | N | IV | Los hologramas cobran vida y atacan; dan mucho botín |
| Marea de Estática | S | IV | Las criaturas Cristal se duplican; todo brilla |
| Luna Interior | A | IV | Algo brilla en el fondo: +rareza de botín durante 15 min |
| Nieve de Ceniza | * | II | Todo se ralentiza un 20 %, pero la Base produce el doble |
| Viento del Fondo | * | III | El héroe es empujado: +2 tramos gratis |

### 4.3 Base Colgante
| Evento | Corr. | Desde | Efecto |
|---|---|---|---|
| Festival de la Base | * | II | +50 % de producción durante 15 min, con luces y banderines |
| Sabotaje | N | II | Un módulo se apaga 10 min; luego se repara mejorado |
| Cable Roto | * | II | La Base cae de golpe: +1 tramo y susto visual |
| Nacimiento | A | III | Nace una mascota extra |
| Suministros de Arriba | * | II | Una cápsula baja con materiales |
| Plaga de Óxido | N | III | −30 % de producción hasta que el Taller la cura (5–10 min) |
| El Inventor | * | III | Módulo experimental aleatorio durante 1 hora |
| Visitantes Refugiados | * | IV | +habitantes en la Base y +producción permanente del día |
| Antena Improvisada | S | III | La próxima Encrucijada se anuncia 15 min antes |

### 4.4 Compañeros
| Evento | Corr. | Desde | Efecto |
|---|---|---|---|
| Discusión | * | II | Dos compañeros pelean (−sinergia 5 min) y luego se reconcilian (+10 % permanente) |
| Juramento | * | III | Dos compañeros con la misma etiqueta crean un ataque combinado |
| Sueño Compartido | A | III | Revela el presagio de la próxima sub-capa |
| Mutación Espontánea | * | III | Un compañero muta (visible en su sprite) |
| La Traición ★ | N | IV | Un compañero roba moneda y desaparece. Vuelve 1 h después **evolucionado** con disculpas |
| Lección | * | II | El compañero de mayor nivel entrena a otro: +2 niveles |
| Nostalgia | * | IV | Un compañero cuenta su historia (texto en el log) y gana +1 rasgo |

### 4.5 Tesoros
| Evento | Corr. | Desde | Efecto |
|---|---|---|---|
| Cofre Sellado | * | I | Moneda o Artefacto común |
| Cápsula del Tiempo | S | II | Artefacto de grado Raro o superior |
| Bolsillo de Esporas | A | II | Gran cantidad de esencia |
| Caja Negra | N | III | Fragmento de lore + créditos |
| Mapa Mojado | * | II | La próxima Encrucijada de Rumbo tiene 4 cartas |
| Pieza de Mapa | * | II | Avanza la Cadena "El Mapa del Cartógrafo" |
| Altar Abandonado | A | IV | Sacrifica moneda a cambio de una bendición larga (1 h) |

### 4.6 Peligros (crean tensión, nunca bloquean)
| Evento | Corr. | Desde | Efecto |
|---|---|---|---|
| Emboscada | * | I | Oleada de criaturas x3 |
| Derrumbe | * | II | El héroe queda bloqueado 1 min y encuentra un Artefacto bajo los escombros |
| Cazador de Descensores | N | III | Mini-jefe que persigue al grupo 20 min y reaparece hasta que muere |
| Depredador del Techo | A | III | Ataca desde arriba; si se le vence, da una mascota rara |
| Protocolo de Purga | S | IV | Centinelas en masa durante 10 min |
| Pico de Presión | * | IV | Presión x2 durante 10 min y Mutación garantizada |
| Plaga de Glitches | S | V | Las criaturas se duplican al azar; botín x2 |
| Marea Negra | * | V | El vacío sube por la pared: hay que correr (+velocidad, −defensa) |

### 4.7 Rarezas (≤ 2 % por día cada una; se registran en la Crónica como "vista X veces")
| Rareza | Qué se ve | Efecto |
|---|---|---|
| **El Tren Fantasma** | Un tren iluminado recorre la pared vertical del abismo | El grupo lo aborda: +10 tramos |
| **La Ballena de Niebla** | Una ballena colosal cruza el abismo y todo se detiene 1 min a mirarla | Todo x2 durante 10 min |
| **La Ciudad Espejo** | Durante 10 min se ve la megaciudad invertida en el vacío | Criaturas reflejo con botín especial |
| **El Teléfono de la Pared** | Un teléfono público suena en la roca | Mensaje críptico + Artefacto legendario |
| **El Descensor de Ayer** | Aparece tu héroe del día anterior (tomado de la Crónica) y corre contigo | Pelea a tu lado 30 min. Solo visual/temporal, no transfiere poder |
| **Lluvia de Placas** | Caen placas de Descensores olvidados | Se registran nombres procedurales en la Crónica |
| **La Puerta Pintada** | Una puerta dibujada en la roca que se abre | Mini-capa secreta de 10 min con paleta única |
| **El Jardín de Relojes** | Todo va lento en lo visual | Producción x2 durante 15 min |
| **La Mirada** | Un ojo gigante se abre en la pared y te observa | Descubre 1 combo secreto + +rareza el resto del día |
| **La Canción** | Las criaturas dejan de pelear y cantan | 2 min de paz y un buff enorme después |

---

## 5. Cadenas (historias de varias partes)

Cada día se activan **2–3 cadenas** elegidas por la semilla: la **Cadena A** sigue los hitos de la ruta y las demás se reparten dentro de sus ventanas. Si el jugador no llega a la parte final, la Crónica muestra "Historia sin terminar…", lo que da ganas de llegar más lejos al día siguiente.

| Cadena | Partes |
|---|---|
| **La Señal** | (1) Una antena capta latidos desde abajo → (2) los latidos se triangulan y tienen un ritmo humano → (3) se encuentra la fuente: un Descensor dormido que se une como **compañero legendario** |
| **El Mapa del Cartógrafo** | 4 piezas de mapa en cofres repartidos durante el día → con el mapa completo: **atajo de 20 tramos** + sub-capa secreta de 15 min |
| **La Deuda** (N) | (1) Un prestamista te da x5 moneda → (2) 2 h después llegan sus cobradores → (3) si se vencen, te quedas todo + Artefacto; si no, pierdes el 50 % |
| **La Semilla** (A) | Se planta una semilla en la Base, que crece visiblemente cada hora → en la parte 4 (unas 4 h después) se convierte en un **árbol que envuelve la Base** con producción x2 |
| **El Huésped** (S) | Un cuerpo vacío sigue al grupo sin pelear y cada hora aprende una habilidad de un compañero → al final despierta como compañero con todas ellas |
| **Cartas de Arriba** | Cada 2 h llega una carta de alguien en la superficie (historia corta y emotiva). La última carta tiene un final distinto según la profundidad |
| **El Rival** | Un Descensor rival aparece cada 2 h, cada vez más fuerte → **duelo final a las 12:00** (o en el último hito alcanzado) |
| **La Plaga Lenta** | Una infección se extiende por la Base parte a parte → hay que encontrar 3 ingredientes en eventos → cura + inmunidad y bonus |
| **El Niño de Hojalata** (S/N) | Un pequeño robot se pierde y lo encuentras → lo cuidas → descubres que es la llave de una puerta en Lo Hondo |
| **La Procesión** (A) | Criaturas pacíficas bajan en fila → las sigues → llegas a su santuario, donde **te bendicen** o te ponen a prueba |

**Formato:**

```ts
ChainDef { id, corriente, partes: [{ ventanaMin: [desde, hasta], textoLog, efecto, condicion? }] }
```

Cada parte se dispara dentro de su ventana de tiempo trabajado y aparece como un **banner especial** con un ícono de pergamino.

---

## 6. Cantidades y pruebas

- **Mínimos de este documento:** 12 condiciones del día, 70 eventos (incluidas las rarezas) y 10 cadenas.
- **El simulador** (`npm run sim`) debe informar para un día de 16 h:
  - eventos únicos vistos;
  - partes de cadena completadas;
  - mayor hueco sin novedad (≤ 12 min);
  - hora real a la que se alcanza cada hito.
- **Prueba de variedad:** 10 días simulados con semillas distintas deben tener menos del 40 % de eventos en común en el mismo orden.
