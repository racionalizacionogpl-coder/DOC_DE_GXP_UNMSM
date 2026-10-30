# Flujo BPMN 2.0: FUT Virtual N° 00959991/UNMSM

Modelo del recorrido del expediente en el Sistema de Gestión Documental (10/08/26 al 30/10/26), en notación BPMN 2.0 para **Bizagi Modeler**.

| Archivo | Uso |
|---|---|
| `flujo_FUT_00959991.bpmn` | Modelo BPMN 2.0 XML con diagrama (DI). Se abre en Bizagi Modeler. |
| `flujo_FUT_00959991.png` / `.svg` | Vista previa del diagrama. |
| `generar_bpmn.py` | Script que genera el `.bpmn` (`python3 generar_bpmn.py`). |

## Cómo abrirlo en Bizagi Modeler

1. Abrir Bizagi Modeler y crear un modelo nuevo.
2. **Archivo → Importar → BPMN** y elegir `flujo_FUT_00959991.bpmn`.
3. Cada tarea trae en **Descripción** el documento, la fecha y hora de emisión y recepción, el tiempo de recepción y el estado.

## Estructura del modelo

- **Pool "Administrado / Solicitante"**: presenta el FUT Virtual; un flujo de mensaje inicia el proceso de la UNMSM.
- **Pool "UNMSM – Trámite del FUT Virtual N° 00959991"** con 23 carriles, uno por dependencia (MP-SG, Rectorado, UPRR, DGA, MP-OGPL, OP, OGPL, OGE, UTYC, OGRRHH, OROS, FCM, etc.).
- **Tareas de usuario** por cada recepción y emisión de documento, con el **objeto de datos** del documento emitido (Proveído, Hoja de Envío, Resolución Rectoral).
- **Compuerta exclusiva** en el Rectorado ("¿Requiere opinión de DGA / presupuesto?") y su unión. Es un supuesto de modelado: el SGD sólo registra la rama **Sí**.
- **Compuertas paralelas** para la distribución de la HE N° 008533-2026-UTYC-OSA-SG (1 original + 11 copias), de la HE N° 006211-2026-OGRRHH-DGA y de la HE N° 002713-2026-D-FCM.
- **Evento de temporizador no interruptor** en OCPF: la copia sigue **NO LEÍDA** después de 42d 4h.
- **Eventos de fin** según el estado final de cada destino: archivado, atendido, recibido o pendiente de lectura.

## Cronología registrada

| # | Documento | Origen → Destino | Emisión | Recepción | T. recep. | Estado |
|---|---|---|---|---|---|---|
| 1 | FUT Virtual N° 00959991/UNMSM | MP-SG → MP-SG (original) | 10/08 09:14 | 10/08 09:15 | 0m | Derivado |
| 2 | Proveído N° 026121-2026-UTD-SG | MP-SG → Rectorado | 10/08 10:35 | 10/08 12:33 | 1h | Derivado |
| 3 | Proveído N° 014073-2026-R-D | Rectorado → DGA | 01/09 15:45 | 01/09 15:57 | 11m | Derivado |
| 4 | Proveído N° 002459-2026-DGA | DGA → MP-OGPL | 01/09 16:05 | 01/09 16:16 | 10m | Derivado |
| 5 | HE N° 003218-2026-MP-OGPL | MP-OGPL → OP-OGPL | 01/09 16:16 | 01/09 16:18 | 1m | Derivado |
| 6 | HE N° 001356-2026-OP-OGPL | OP → OGPL | 01/09 17:46 | 01/09 17:48 | 1m | Derivado |
| 7 | Proveído N° 002233-2026-OGPL | OGPL → OGE-DGA | 01/09 17:57 | 02/09 10:19 | 16h | Derivado |
| 8 | Proveído N° 003440-2026-OGE-DGA | OGE → DGA | 02/09 10:22 | 02/09 10:36 | 13m | Derivado |
| 9 | Proveído N° 002493-2026-DGA | DGA → MP-SG | 02/09 11:10 | 02/09 11:26 | 15m | Derivado |
| 10 | Proveído N° 029408-2026-UTD-SG | MP-SG → Rectorado | 02/09 13:54 | 03/09 14:55 | 1d 1h | Atendido |
| 11 | Proveído N° 014311-2026-R-D | Rectorado → MP-SG | 03/09 17:00 | 03/09 17:32 | 31m | Derivado |
| 12 | Proveído N° 029679-2026-UTD-SG | MP-SG → Rectorado UPRR | 03/09 17:33 | 04/09 15:40 | 22h | Derivado |
| 13 | Resolución Rectoral N° 011678-2026-R | UPRR → UTYC-OSA-SG | 16/09 18:20 | 17/09 09:51 | 15h | Derivado |
| 14 | HE N° 008533-2026-UTYC-OSA-SG | UTYC → 12 destinos | 17/09 18:39 | ver abajo | | Recibido parcial |
| 15 | HE N° 006211-2026-OGRRHH-DGA | OGRRHH → OROS (orig.) / Gestión y Escalafón (copia) | 18/09 16:00 | 16:40 / 16:22 | 39m / 21m | Archivado |
| 16 | HE N° 003540-2026-MP-FCM | MP-FCM → Decanato FCM | 18/09 06:41 | 18/09 08:44 | 2h | Atendido |
| 17 | HE N° 002713-2026-D-FCM | Decanato → MP-FCM (orig.) / EPIO (copia) | 18/09 14:39 | 18/09 15:18 / 22/09 14:18 | 38m / 3d 23h | Recibido |

**Destinos de la HE N° 008533-2026-UTYC-OSA-SG:** MP-DGA original (archivado, 17h) · MP-OGAL (archivado, 3d 1h) · MP-OGPL (archivado, 14h) · OGRRHH (derivado, 20h) · **OCPF (NO LEÍDO, 42d 4h)** · OC (archivado, 17h) · MP-OT (archivado, 17h) · OGE (archivado, 14h) · UAA (archivado, 3d 13h) · MP-OCI (atendido, 14h) · OTAIP (archivado, 14h) · MP-FCM (derivado, 11h).

## Puntos de atención

- **Rectorado**: 22 días entre la recepción (10/08) y el proveído a DGA (01/09).
- **UPRR**: 12 días entre la recepción (04/09) y la emisión de la Resolución Rectoral (16/09).
- **OCPF**: la única copia sin leer, 42d 4h al 30/10/26.
