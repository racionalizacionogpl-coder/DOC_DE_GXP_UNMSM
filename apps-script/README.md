> **Repositorio activo:** `racionalizacionogpl-coder/DOC_DE_GXP_UNMSM`
> (migrado desde `claudecompartido7-afk/DOC_DE_GXP_UNMSM` tras el bloqueo
> de esa cuenta de Gmail — no editar el repositorio anterior).
>
> - **Dashboard:** https://racionalizacionogpl-coder.github.io/DOC_DE_GXP_UNMSM/
> - **Backend (Apps Script):** proyecto standalone bajo `racionalizacion.ogpl@gmail.com`,
>   URL `/exec` configurada en `Dashboard.html` → `GXP_ENDPOINT`.

# Registro de decisiones · Web App de Apps Script

Backend que recibe las recomendaciones aceptadas en el panel **Diagnóstico** del
Centro de Documentación y las registra en los cuatro documentos del proyecto.

## Los cuatro destinos

| | Archivo | Tipo real en Drive | API |
|---|---|---|---|
| D1 | 1_PLAN_GESTIÓN_DE_ALCANCE_UNMSM | Documento de Google | `DocumentApp` |
| D2 | 2_PLAN DE GESTIÓN DEL CRONOGRAMA (GANTT) | Hoja de Google | `SpreadsheetApp` |
| D3 | 3_BITÁCORA DE LA IMPLEMENTACIÓN | **`.xlsx` subido** | `SpreadsheetApp`, previa conversión |
| D4 | 4_REVISIÓN_INTERNA DE_AVANCES | Hoja de Google | `SpreadsheetApp` |

> **D3 requiere un paso extra.** El archivo está en Drive como `.xlsx` de Excel,
> no como Hoja de Google. `SpreadsheetApp.openById()` no puede abrirlo y lanza
> excepción. Ejecute `convertirBitacora()` una vez (ver abajo).

En D1 el registro es una **tabla al final del documento**, delimitada por un
marcador invisible. En D2, D3 y D4 es una **pestaña propia** llamada
`Decisiones GxP`: el script nunca escribe en las pestañas de datos del proyecto.

## Instalación

1. **Cree el proyecto.** [script.google.com](https://script.google.com) → *Nuevo proyecto*.
   Pegue `Codigo.gs` en el editor.

2. **Active la Drive API.** Panel izquierdo → *Servicios* → **Drive API**, versión
   **v3**, identificador `Drive`. Sólo la necesita `convertirBitacora()`.

3. **Convierta la bitácora.** Seleccione `convertirBitacora` en el desplegable de
   funciones y pulse *Ejecutar*. Autorice los permisos. En el registro aparecerá
   el ID de la copia nativa, que queda guardado en las propiedades del script.
   El original `.xlsx` no se toca.

4. **Compruebe los destinos.** Ejecute `inicializarDestinos()`: crea la tabla y las
   pestañas en los cuatro archivos y deja en el registro el estado de cada uno.

5. **Publique la Web App.** *Implementar* → *Nueva implementación* → tipo
   **Aplicación web**.
   - *Ejecutar como:* **Yo** — el script escribe con sus permisos, así los usuarios
     de la web no necesitan acceso de edición a los documentos.
   - *Quién tiene acceso:* **Cualquier usuario**.

   Copie la URL que termina en `/exec`.

6. **Conecte el frontend.** En `index.html`, línea ~714:

   ```html
   <script>window.GXP_ENDPOINT = 'https://script.google.com/macros/s/AKfy…/exec';</script>
   ```

7. **Verifique.** Abra la URL `/exec` en el navegador: `doGet` devuelve el estado
   de los cuatro destinos con su nombre, su MIME y si son escribibles.

## Actualizar el backend · el paso que se olvida

Pegar el código nuevo en el editor **no cambia nada en producción**. Apps Script
sigue sirviendo la última *versión implementada* hasta que se crea una nueva.

1. Pegue el `Codigo.gs` actualizado y guarde (Ctrl+S).
2. **Implementar › Gestionar implementaciones**.
3. Pulse el lápiz **✏** de la implementación activa.
4. En **Versión** elija **Nueva versión**. Este es el paso decisivo.
5. **Implementar**.

La URL `/exec` no cambia: no hay que tocar `index.html`.

Para comprobarlo, abra la URL `/exec` en el navegador. La respuesta incluye:

```json
{"ok":true,"version":"2.1.0","acciones":["ping","decision","eliminar","listar","contenido","editar"], …}
```

Si no aparece `version` o falta `contenido` en `acciones`, la implementación
sigue siendo la antigua y el visor mostrará *«El Apps Script publicado está
desactualizado»* en lugar del documento con resaltado.

## Cómo se estructura el envío a varios IDs

El cliente **no sabe** cuántos documentos hay. Envía una sola petición con la
decisión y la lista de documentos que el hallazgo afecta; el servidor decide el
resto. Tres piezas lo hacen posible:

**1 · `DESTINOS` — declaración, no código.** Cada archivo es un objeto con
`clave`, `tipo`, `id` y `activo`. Añadir un quinto documento es añadir una línea.
Desactivar uno temporalmente es `activo: false`, sin borrar nada.

**2 · `ESCRITORES` — un traductor por tipo.** Asocia `tipo` con las tres funciones
que saben operar sobre él (`escribir`, `eliminar`, `leer`). El orquestador nunca
pregunta «¿esto es un Doc o una Hoja?»: pide `ESCRITORES[destino.tipo]` y usa lo
que reciba. Soportar Presentaciones sería añadir una entrada `pres`.

**3 · `porCadaDestino()` — aislamiento de fallos.** Recorre los destinos y captura
la excepción de cada uno por separado. Si D3 no está convertido, D1, D2 y D4 se
escriben igual y la respuesta lo dice:

```json
{ "ok": false, "codigo": "D1-02-R1",
  "resultados": [
    { "destino": "D1", "ok": true,  "detalle": { "accion": "insertada", "fila": 4 } },
    { "destino": "D2", "ok": true,  "detalle": { "accion": "actualizada", "fila": 7 } },
    { "destino": "D3", "ok": false, "error": "No es una Hoja de Google…" } ] }
```

`ok` global es `true` sólo si **todos** los destinos se escribieron. Un registro
parcial nunca se reporta como éxito.

### A qué documentos va cada decisión

Lo gobierna la constante `MODO_DESTINO`:

- **`'afectados'`** (por defecto) — la decisión va a **D1**, que actúa como libro
  maestro de todas las decisiones, y además a los documentos que el hallazgo
  afecta según su campo `d`. Una decisión sobre `D1-02` (que afecta a D1 y D2)
  se escribe en el Plan de Alcance y en el Cronograma, no en la Bitácora.
- **`'todos'`** — la decisión se escribe en los cuatro documentos.

### Idempotencia

La escritura es **UPSERT por código**, nunca `append` ciego: se busca el código en
la primera columna y, si existe, se actualiza esa fila. Consecuencias prácticas:

- Reenviar la misma decisión no duplica filas.
- El reintento automático del cliente tras un fallo de red es seguro.
- Editar una recomendación ya aceptada actualiza la fila existente.

Toda la operación va dentro de un único `LockService`, de modo que dos personas
aceptando a la vez no pueden crear dos veces la misma tabla o la misma pestaña.

## Protocolo

Petición `POST` con `Content-Type: text/plain;charset=utf-8` — **es
deliberado**: Apps Script no responde a las peticiones `OPTIONS` de verificación
previa, así que `application/json` haría fallar la petición por CORS.

```jsonc
// accion: 'decision'
{ "accion": "decision",
  "codigo": "D1-02-R1",
  "severidad": "alto",
  "titulo": "«Automatización» está excluida del alcance pero…",
  "recomendacion": "Texto definitivo, original o editado por el equipo.",
  "editada": true,
  "destinos": ["D1", "D2"],
  "fecha": "26/08/2026, 09:19 p. m." }
```

| Acción | Efecto |
|---|---|
| `ping` | Estado de los cuatro destinos. Igual que `doGet`. |
| `decision` | Inserta o actualiza la decisión en los destinos que correspondan. |
| `eliminar` | Retira la decisión de **todos** los destinos activos. |
| `listar` | Devuelve lo registrado en D1, para rehidratar la interfaz. |

## Comportamiento sin conexión

El frontend guarda cada decisión en `localStorage` **antes** de enviarla. Si la
red falla, la decisión queda en una cola y se muestra `⚠ No se pudo registrar`;
al recuperarse la conexión (evento `online` o recarga de la página) se reintenta
sola y el sello pasa a `✓ Registrada`. Ninguna aceptación se pierde por un fallo
de red.

## Pruebas sin tocar los documentos reales

El endpoint se puede sobrescribir desde la consola del navegador sin editar
`index.html`:

```js
localStorage.setItem('gxp.endpoint', 'https://…/exec');   // apuntar a un despliegue de prueba
localStorage.removeItem('gxp.decisiones.v1');             // borrar las decisiones locales
```


## Acceso al área interna

El Centro de Documentación es público. El diagnóstico —hallazgos,
contradicciones, avance por facultad y recomendaciones— no, y no está en el
repositorio: vive en `Datos.gs` y sólo se entrega tras validar credenciales.

Es la única forma de que la separación sea real. El sitio es estático: cualquier
archivo que forme parte de él es legible con «ver código fuente», con contraseña
o sin ella. Un control de acceso hecho en el navegador escondería un contenido
que ya viajó.

### Dar de alta a una persona

Desde el editor de Apps Script, en el desplegable de funciones, con la llamada
escrita en el propio editor:

```js
altaUsuario('nombre@unmsm.edu.pe', 'una-clave-de-8-o-mas', 'Nombre Apellido');
```

Borre la línea después de ejecutarla: el editor guarda el historial.

- `bajaUsuario('correo')` retira el acceso.
- `listarUsuarios()` escribe los correos registrados en el registro de ejecución.

Las contraseñas no se almacenan: se guarda su huella SHA-256 con una sal
distinta por persona. Quien lea las propiedades del script no puede deducirlas.

### Qué exige sesión

Sólo `ping` y `entrar` responden sin credenciales. Todo lo demás —leer el
diagnóstico, registrar decisiones, leer o editar los documentos— exige una ficha
de sesión válida, que dura diez horas.

### Actualizar los datos internos

`Datos.gs` se genera desde el repositorio; no se edita a mano. Cuando cambien los
hallazgos o los paneles hay que regenerarlo y volver a implementar el Apps
Script con una versión nueva.

## El tablero en vivo · `Tablero.gs`

`Dashboard.html` llevaba sus cifras incrustadas en el propio archivo: para que
la web reflejara una auditoría nueva había que regenerar el HTML y volver a
publicarlo. Con `Tablero.gs` las pide al servidor, y cada corrida de
`ejecutarAuditoriaAnexo1`, `ejecutarRevisionAnexo3` o `ejecutarRevisionAnexo4`
se ve en la portada sin tocar el repositorio.

### Instalación

1. Pegar `Tablero.gs` en **este mismo proyecto** —el que publica la aplicación
   web—, no en el proyecto enlazado a la hoja.
2. En `Codigo.gs`, dentro del **primer** `switch` de `doPost` (el de las
   acciones que no exigen credenciales), ya está añadida la línea:

   ```javascript
   case 'tablero':   return responder(tablero());
   ```

3. Volver a implementar con versión **«Nueva»**.
4. `probarTablero()` desde el editor dice qué hojas encuentra y qué cifras
   saca de cada una, sin pasar por la web.

### De qué hoja sale cada cifra

| Hoja del libro | Qué aporta al tablero |
|---|---|
| `RESUMEN_GENERAL` | % Anexo 1, % Anexo 3 y % general de cada facultad |
| `RESUMEN_EJECUTIVO_A1` | productos conformes, observados y sin registrar; nº de procesos |
| `RESUMEN_EJECUTIVO_A3` | fichas totales, completas, incompletas y sin producto |
| `DETALLADO_PRODUCTOS_A1` | detalle de productos de la vista de base de datos |
| `OBSERVACIONES_DE_PROCESO_A1` | detalle de procesos y subprocesos |
| `RESUMEN_FICHAS_A3` | detalle de fichas técnicas |
| `RESUMEN_EJECUTIVO_A4` | indicadores del Anexo 4 |
| `HISTORIAL_REVISIONES` | la variación entre la revisión actual y la anterior |
| `CODIFICACION_ DE_LAS_FACULTADES` | el catálogo: sigla, nombre y número de formulario |

Las pestañas se localizan comparando solo letras y dígitos, así que el espacio
suelto del nombre real —`CODIFICACION_ DE_LAS_FACULTADES`— no estorba, y
corregirlo algún día tampoco romperá nada.

El catálogo manda sobre el que lleva escrito `Tablero.gs`: una renumeración
como la que movió FII a F17 y FISI a F20 se hace en la hoja y el tablero la
recoge sin volver a publicar la aplicación web. Si la hoja falta o no da las 20
facultades, se conserva el del código, que es preferible a un tablero vacío.

Una hoja que aún no se haya generado no rompe nada: esa parte sale en cero y
el resto del tablero se pinta igual.

### Por qué se responde sin credenciales

El tablero está publicado también en la portada pública, así que `tablero` va
en el switch de acciones abiertas. Devuelve solo cifras de avance y el detalle
de la revisión —lo mismo que ya viajaba incrustado en el HTML y era visible en
el código fuente—. Los paneles del área interna, las decisiones y la edición de
documentos siguen exigiendo sesión.

Si esa exposición deja de ser aceptable, mover el `case 'tablero'` al segundo
switch lo cierra: entonces el tablero solo tendrá datos frescos dentro de
`interno.html`, y en la portada se quedará con los incrustados.

### Cuánto tarda en verse un cambio

El servidor guarda su respuesta **60 segundos** (`TABLERO.CACHE_SEG`), y el
navegador vuelve a preguntar cada **dos minutos** (`CADA`, en `Dashboard.html`),
al volver a la pestaña, y cuando se pulsa el botón de recarga del encabezado.
En el peor caso, unos tres minutos desde que termina la auditoría. El botón lo
hace inmediato.

Una pestaña en segundo plano no pregunta: no gasta cuota de Apps Script en
refrescar algo que nadie está mirando.

### Si el servidor no contesta

El HTML conserva incrustado el último estado conocido. Si la petición falla
—red caída, endpoint sin publicar, despliegue mal configurado— el tablero se
queda con esas cifras y lo dice en el encabezado, en lugar de aparecer vacío.
Por eso el bloque `DATOS_FUENTE` sigue en el archivo y conviene refrescarlo de
vez en cuando.

### Comprobación

```
node verificar-tablero.js     # 38 comprobaciones sobre Tablero.gs, sin red
node verificar-dashboard.js   # 26 sobre los datos incrustados de respaldo
```

### El % del Anexo 4 sale de una celda, no de un recuento

`RESUMEN_EJECUTIVO_A4!F36` lleva el avance según la última versión del
historial de revisión, ya ponderado. `TABLERO.CELDA_PCT_A4` apunta ahí y ese
valor manda sobre contar aprobados entre el total, que trata por igual a
indicadores que no pesan lo mismo.

El recuento se conserva como respaldo —si la celda está vacía, el tablero usa
ese en lugar de mostrar un cero que parece un dato— y viaja en la respuesta
como `anexo4.pctContado`. `probarTablero()` dice cuál de los dos se usó.

Si la hoja cambia y el valor pasa a otra celda, se ajusta `CELDA_PCT_A4` y
basta con volver a implementar.

### De dónde sale cada porcentaje de las tarjetas

Orden de preferencia, y por qué:

1. **`HISTORIAL_REVISIONES`** — es la cifra que el propio auditor escribe al
   terminar su corrida, y la que la OGPL da por buena para cada anexo.
2. **`RESUMEN_EJECUTIVO_A4!F36`** — solo para el Anexo 4, si aún no hay
   registro suyo en el historial.
3. **El cálculo sobre las hojas de resumen** — si falta todo lo anterior.
   Mejor una cifra recalculada que un hueco.

Lo que las hojas dan por su cuenta viaja siempre en `kpi.hojas`, aunque no lo
pinte ninguna tarjeta: `probarTablero()` enseña las dos cifras, que es lo que
hace falta cuando no coinciden porque alguien editó una hoja a mano después
de la corrida.

El KPI de **Fase 1** no está en el historial: es un agregado de las veinte
facultades y se calcula siempre.

### La variación se mide anexo por anexo

Cada tarjeta compara su último registro contra **el penúltimo de ese mismo
anexo**, no contra la corrida anterior del conjunto. Los tres auditores se
ejecutan por separado, así que la revisión anterior del Anexo 4 puede ser de
otro día que la del Anexo 1; medirlas contra corridas conjuntas enfrentaba una
tarjeta a una revisión que no era la suya, y rotulaba una fecha ajena.

Con un solo registro no hay variación: la tarjeta lo dice, en vez de mostrar
un 0 que se lee como «no ha avanzado».

### La serie completa para las líneas de tendencia

Cada anexo viaja además con `serie`: **todos** sus registros de
`HISTORIAL_REVISIONES`, del primero al último, y en cada punto su variación
contra el inmediatamente anterior.

La variación se calcula aquí y no en el navegador a propósito. La tarjeta y su
gráfico de tendencia muestran la misma cifra; con dos aritméticas separadas
acabarían discrepando por un redondeo, y nadie sabría cuál creer.

Con un solo registro no hay tendencia que trazar: el tablero lo dice en lugar
de dibujar una línea de un punto.

### Los nombres de hoja del encargo y los del libro

El encargo del panel de detalle nombraba tres hojas y en el libro hay dos:

| Lo pedido | Lo que existe |
|---|---|
| `OBSERVACIONES_DE_PRODUCTOS_A1` | `DETALLADO_PRODUCTOS_A1` |
| `OBSERVACIONES_DE_PROCESOS_A1` | `OBSERVACIONES_DE_PROCESO_A1` (en singular) |
| `OBSERVACIONES_DE_PROCESOS` | — no existe |

Los procesos de Nivel 0 y los subprocesos **comparten hoja** y se distinguen
por su columna `NIVEL`, que es lo que `Tablero.gs` traduce a las entidades
`Proceso` y `SubProceso`. El efecto en el tablero es el pedido —cada tarjeta
proyecta datos distintos—, pero salen de dos hojas y no de tres.

### El desglose de procesos y subprocesos

`RESUMEN_EJECUTIVO_A1` trae en las columnas 11-13 los procesos de Nivel 0
conformes, observados y sin registrar, y en las 14-16 los mismos tres de los
subprocesos. Se leía la fila entera y solo se usaba el total: las tarjetas de
«Procesos» y «SubProcesos» salían siempre en cero. Ahora cada facultad los
lleva en `procesosN0` y `subprocesos`, y los totales del tablero son su suma.

### Fase 1 en el historial

`% Avance Fase 1` sale, por este orden:

1. **La fila «Fase 1» más reciente** de `HISTORIAL_REVISIONES`. Es la única vía
   que trae fecha, así que es la única con la que la tarjeta puede mostrar su
   variación y su línea de tendencia.
2. **La celda `C14`** (`TABLERO.CELDA_PCT_FASE1`), cuando esa búsqueda no da
   con la fila —el rótulo cambió, la columna A quedó vacía—.
3. El promedio de las facultades con avance.

`probarTablero()` dice cuál de las tres se usó.

«Fase 1» se comprueba **antes** que los anexos al clasificar el historial:
lleva un 1 en el nombre y, si no, se colaría como Anexo 1 y falsearía las dos
series.

### Una fecha ilegible ya no borra la fila

La columna A se escribe a veces como texto —`28/08/2026 09:00`—, y
`new Date` lo interpreta al revés o lo rechaza. La fila se descartaba **en
silencio**: registros que estaban perfectamente en la hoja no llegaban al
tablero y nada lo decía.

Ahora se admite el formato de día primero, y una fecha que aun así no se
entienda no descarta nada: la fila se conserva y, a falta de fecha, manda su
posición en la hoja, que es el orden en que se registró. «El último registro»
sigue siendo el de más abajo.

`probarTablero()` vuelca la hoja **fila a fila** con lo que dice cada columna y
cómo se ha clasificado. Cuando una fila «no aparece», eso es lo que hace falta
ver, no adivinarlo.

### El detalle completo, sin recortes silenciosos

`TABLERO.MAX_REGISTROS` estaba en 3000 y las hojas suman más —
`DETALLADO_PRODUCTOS_A1` ronda las 2900 filas y `OBSERVACIONES_DE_PROCESO_A1`
casi 1000—, así que se perdían cientos de registros sin avisar. Ahora está en
25 000: cabe el libro entero con holgura, y es un tope de seguridad, no un
recorte de trabajo.

A cambio, la respuesta pasa de largo el máximo de la caché de Apps Script
(100 KB por entrada) y deja de guardarse: cada consulta relee el libro. Es el
precio de no perder filas. `probarTablero()` lo dice, y también avisa en
mayúsculas si algo llegara a recortarse.

En el navegador había un segundo tope, peor porque era invisible: la tabla de
detalle pintaba **50 filas** mientras su pie decía «Total filtrado: 2.400
registros». Ahora pinta bloques de 200, dice cuántas de cuántas, y ofrece un
botón para seguir.

### La paleta de las barras es de tres tramos, no de cuatro

Las barras de «% Avance por Facultad» usan la paleta corporativa:

| Avance | Color | Por qué |
|---|---|---|
| ≥ 80 % | `#1C4E43` verde abeto | solidez y control |
| 50–79 % | `#94A3B8` gris pizarra | neutro: resta peso para que el ojo vaya a los extremos |
| < 50 % | `#A84641` rojo terracota | crítico, sin la estridencia de un rojo de error |

El panel de clasificación de la derecha conserva sus **cuatro** tramos, que es
lo que se pidió para él. Barra y cuadrante ya no comparten color: el 100 % y el
85 % son la misma barra verde abeto y dos filas distintas del panel. Es
deliberado; para volver a que coincidan, basta con que `TRAMOS` lea de
`PALETA_BARRAS`.

### El Anexo 3: tres tarjetas, tres hojas

| Tarjeta | Hoja | Estados |
|---|---|---|
| Fichas | `RESUMEN_FICHAS_A3` | Conformes · Observados · Sin Registrar · Crítico |
| Campos | `DETALLE_REVISION_A3` | Conformes · Observados · Sin Registrar · Crítico |
| Denominación | `REGISTRO_MAESTRO_CODIGOS_A3` | Conformes · Observados |

Cada tarjeta tiene **un solo origen**, ranking incluido: el de «Fichas» sale de
los recuentos de `RESUMEN_FICHAS_A3` y sigue al estado elegido, igual que los
otros dos. Hubo una versión en que ordenaba por el `% AVANCE` de
`RESUMEN_EJECUTIVO_A3` y entonces no cambiaba al pulsar otro estado, lo que
obligaba a explicarlo en pantalla.

Las fichas se clasifican por su columna `CLASIFICACIÓN`, que el mismo auditor
escribe con los mismos rótulos que el detalle. Si viniera vacía, se recae en el
`¿COMPLETA?` de siempre, que solo distingue dos estados.

El desglose por estado va en `fichasEstado`, aparte del `fichas`
—completas/incompletas/sin producto de `RESUMEN_EJECUTIVO_A3`— del que sale el
KPI del Anexo 3, para no tocar esa aritmética.

**Las tres hojas traen su columna `ESTADO` ya calculada** —CONFORME,
OBSERVADO, SIN REGISTRAR, CRÍTICO—, así que no hay nada que traducir:
`normalizarEstado_()` solo tolera tildes y mayúsculas.

| Hoja | Columna ESTADO |
|---|---|
| `RESUMEN_FICHAS_A3` | H (índice 7) |
| `DETALLE_REVISION_A3` | G (índice 6) |
| `REGISTRO_MAESTRO_CODIGOS_A3` | F (índice 5) |

Una celda vacía, o con algo que no se reconozca, **no se cuenta**: ni acierto
ni fallo.

> Esto costó dos vueltas. El código leía la estructura que escribe
> `Anexo3_Revision_v3.gs` —con rótulos «Correcto / Incompleto / Observación» y
> otras posiciones de columna—, que **no es la que tiene el libro**. Con las
> columnas equivocadas las tres tarjetas salían en cero, en silencio. Si alguna
> vuelve a vaciarse, `probarTablero()` vuelca ahora las tres hojas fila a fila
> con lo que dice cada columna y cuántas filas se clasifican, se caen por
> estado, o se caen por facultad.

**El orden de los rankings es distinto aquí.** En el Anexo 1, Observados y Sin
Registrar ordenan de menor a mayor porque 0 es lo ideal. En el Anexo 3 se pidió
que las dos tarjetas ordenen **siempre de mayor a menor**, en todos sus
estados. Lo fija `RANKING[bloque].orden`.

Si alguna de las dos hojas falta, las tarjetas salen en cero y el resto del
tablero se pinta igual.

### La respuesta va en dos tiempos

`tablero({detalle: false})` devuelve **solo los agregados** —facultades,
totales, KPI e historial—: unos 16 KB, y es lo que llena las tarjetas, los
rankings y los gráficos. El detalle —decenas de miles de filas entre productos,
procesos, campos y códigos— viaja en una segunda petición y solo lo necesitan
las tres tablas.

Antes iba todo junto. Con el libro completo esa respuesta ronda los **2 MB** y
puede fallar entera; cuando fallaba, el tablero caía a sus datos incrustados
**sin decir nada**, y la pantalla parecía vacía sin ninguna pista de por qué.

Ahora lo de arriba llega siempre. Si el detalle no cabe, la cabecera lo dice
—«Actualizado … · sin detalle»— y las tablas se quedan cortas, pero las cifras
están puestas.

**Los fallos se avisan siempre**, también en el refresco automático, y con el
motivo: «Sin conexión con la hoja · el servidor respondió 503». Callarlo salvo
al pulsar el botón era lo que dejaba la pantalla con datos viejos y sin
explicación.

`probarTablero()` mide el tamaño de las dos partes y avisa si la respuesta se
ha vuelto muy grande.

### Cuando `probarTablero()` funciona pero la web no

Son dos entornos distintos. `probarTablero()` corre **en el editor, como usted**;
la aplicación web responde **al navegador de cualquiera**. Que el primero lea el
libro sin problemas no dice nada del segundo.

La causa más común, con diferencia: la aplicación web no está publicada con
**«Quién tiene acceso: Cualquier usuario»**. Google entonces no devuelve un
error sino su **página de inicio de sesión**, en HTML y con estado 200. El
tablero lo reconoce y lo dice con esas palabras en la cabecera, en lugar del
`Unexpected token <` que salía antes y no orientaba a nadie.

La segunda: la URL de `GXP_ENDPOINT` en `Dashboard.html` no es la del
despliegue vigente. Ocurre al crear un despliegue **nuevo** en vez de editar el
existente con versión «Nueva»: la URL cambia y el tablero sigue llamando a la
vieja.

**La prueba que las distingue en un segundo:** abrir la URL del endpoint
directamente en el navegador. `doGet()` responde con el diagnóstico en JSON.

- Sale JSON → el despliegue es público y funciona; el problema está en otra parte.
- Sale una pantalla de Google pidiendo iniciar sesión → es el acceso.
- Sale «no se encuentra» → la URL no es la del despliegue vigente.
