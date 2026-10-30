#!/usr/bin/env python3
"""Genera el diagrama BPMN 2.0 (con DI) del expediente FUT Virtual N° 00959991/UNMSM,
importable en Bizagi Modeler (Archivo > Importar > BPMN 2.0).

Uso:  python3 generar_bpmn.py   ->  escribe flujo_FUT_00959991.bpmn junto a este script.
"""
from pathlib import Path
from xml.sax.saxutils import escape

# ---------------------------------------------------------------- geometría
POOL_X, POOL_Y = 40, 260          # pool principal (debajo del pool del administrado)
LANE_HDR = 30                      # franja vertical con el nombre del pool
LANE_H = 150
COL_W = 175
COL0_X = POOL_X + LANE_HDR + 140   # x de la columna 0 (después del nombre del carril)
TASK_W, TASK_H = 135, 72
EV = 36
GW = 50
DO_W, DO_H = 36, 46

# ---------------------------------------------------------------- carriles
LANES = [
    ("L_MPSG",   "Mesa de Partes - MP - SG (UTD)"),
    ("L_R",      "Rectorado - R"),
    ("L_UPRR",   "Rectorado - UPRR"),
    ("L_DGA",    "Dirección General de Administración - DGA"),
    ("L_MPOGPL", "Mesa de Partes - MP - OGPL"),
    ("L_OP",     "Oficina de Presupuesto - OP - OGPL"),
    ("L_OGPL",   "Oficina General de Planificación - OGPL"),
    ("L_OGE",    "Oficina General de Economía - OGE - DGA"),
    ("L_UTYC",   "Unidad de Transcripciones y Certificaciones - UTYC - OSA - SG"),
    ("L_MPDGA",  "Mesa de Partes - MP - DGA"),
    ("L_MPOGAL", "Mesa de Partes - MP - OGAL"),
    ("L_OGRRHH", "Oficina General de Recursos Humanos - OGRRHH - DGA"),
    ("L_OROS",   "Of. de Remuneraciones y Obligaciones Sociales - OROS - OGE - OGRRHH"),
    ("L_OGESC",  "Oficina de Gestión y Escalafón - OGE - OGRRHH"),
    ("L_OCPF",   "Of. de Control Previo y Fiscalización - OCPF - DGA"),
    ("L_OC",     "Oficina de Contabilidad - OC - OGE - DGA"),
    ("L_MPOT",   "Mesa de Partes - MP - OT - OGE - DGA"),
    ("L_UAA",    "Unidad de Archivo Administrativo - UAA - OAC - SG"),
    ("L_MPOCI",  "Mesa de Partes - MP - OCI"),
    ("L_OTAIP",  "Of. de Transparencia y Acceso a la Información Pública - OTAIP - SG"),
    ("L_MPFCM",  "Mesa de Partes - MP - FCM"),
    ("L_DFCM",   "Decanato - D - FCM"),
    ("L_EPIO",   "Escuela Profesional de Investigación Operativa - EPIO - FCM"),
]
LANE_IDX = {lid: i for i, (lid, _) in enumerate(LANES)}
POOL_W = COL0_X - POOL_X + 30 * COL_W
POOL_H = LANE_H * len(LANES)

# ---------------------------------------------------------------- nodos
# (id, tipo, carril, columna, nombre, documentación)
N = []
def node(nid, kind, lane, col, name, doc=""):
    N.append(dict(id=nid, kind=kind, lane=lane, col=col, name=name, doc=doc))

node("SE_FUT", "startMsg", "L_MPSG", 0, "FUT Virtual recibido",
     "Ingreso por Mesa de Partes Virtual del FUT N° 00959991/UNMSM (10/08/26 09:14).")
node("T01", "user", "L_MPSG", 1, "Registrar FUT Virtual N° 00959991/UNMSM",
     "Emitido 10/08/26 09:14 | Origen y destino: MP-SG (ORIGINAL) | Recibido 10/08/26 09:15 | T. recepción 0m | Estado: DERIVADO.")
node("T02", "user", "L_MPSG", 2, "Emitir Proveído N° 026121-2026-UTD-SG/UNMSM y derivar a Rectorado",
     "Emitido 10/08/26 10:35 | Destino: Rectorado - R (ATENDER) | Recibido 10/08/26 12:33 | T. recepción 1h | Estado: DERIVADO.")
node("T03", "user", "L_R", 3, "Recibir y evaluar expediente (rec. 10/08 12:33)",
     "El Rectorado recibe el expediente y evalúa si requiere opinión administrativa / presupuestal.")
node("GW1", "xor", "L_R", 4, "¿Requiere opinión de DGA / presupuesto?",
     "Decisión modelada: en el expediente real se tomó la rama SÍ.")
node("T04", "user", "L_R", 5, "Emitir Proveído N° 014073-2026-R-D/UNMSM a DGA",
     "Emitido 01/09/26 15:45 | Destino: DGA (ATENDER) | Recibido 01/09/26 15:57 | T. recepción 11m | Estado: DERIVADO.")
node("T05", "user", "L_DGA", 6, "Recibir (01/09 15:57) y emitir Proveído N° 002459-2026-DGA/UNMSM a OGPL",
     "Emitido 01/09/26 16:05 | Destino: MP-OGPL | Recibido 01/09/26 16:16 | T. recepción 10m | Estado: DERIVADO.")
node("T06", "user", "L_MPOGPL", 7, "Recibir (16:16) y emitir Hoja de Envío N° 003218-2026-MP-OGPL a OP",
     "Emitido 01/09/26 16:16 | Destino: Oficina de Presupuesto - OP - OGPL (ORIGINAL) | Recibido 01/09/26 16:18 | T. recepción 1m | Estado: DERIVADO.")
node("T07", "user", "L_OP", 8, "Evaluar disponibilidad presupuestal (rec. 16:18)",
     "La Oficina de Presupuesto analiza el pedido y prepara su respuesta.")
node("T08", "user", "L_OP", 9, "Emitir Hoja de Envío N° 001356-2026-OP-OGPL a OGPL",
     "Emitido 01/09/26 17:46 | Destino: OGPL (ORIGINAL) | Recibido 01/09/26 17:48 | T. recepción 1m | Estado: DERIVADO.")
node("T09", "user", "L_OGPL", 10, "Recibir (17:48) y emitir Proveído N° 002233-2026-OGPL/UNMSM a OGE",
     "Emitido 01/09/26 17:57 | Destino: OGE - DGA (ATENDER) | Recibido 02/09/26 10:19 | T. recepción 16h | Estado: DERIVADO.")
node("T10", "user", "L_OGE", 11, "Recibir (02/09 10:19) y emitir Proveído N° 003440-2026-OGE-DGA a DGA",
     "Emitido 02/09/26 10:22 | Destino: DGA (ATENDER) | Recibido 02/09/26 10:36 | T. recepción 13m | Estado: DERIVADO.")
node("T11", "user", "L_DGA", 12, "Recibir (10:36) y emitir Proveído N° 002493-2026-DGA/UNMSM a MP-SG",
     "Emitido 02/09/26 11:10 | Destino: MP-SG (ATENDER) | Recibido 02/09/26 11:26 | T. recepción 15m | Estado: DERIVADO.")
node("T12", "user", "L_MPSG", 13, "Recibir (11:26) y emitir Proveído N° 029408-2026-UTD-SG/UNMSM a Rectorado",
     "Emitido 02/09/26 13:54 | Destino: Rectorado - R (ATENDER) | Recibido 03/09/26 14:55 | T. recepción 1d 1h | Estado origen: ATENDIDO X DESTINO | Estado destino: ATENDIDO.")
node("T13", "user", "L_R", 14, "Recibir (03/09 14:55) y atender expediente",
     "Estado destino: ATENDIDO. El Rectorado dispone la emisión de la resolución.")
node("GW2", "xor", "L_R", 15, "", "Unión de las ramas de la decisión del Rectorado.")
node("T14", "user", "L_R", 16, "Emitir Proveído N° 014311-2026-R-D/UNMSM a MP-SG",
     "Emitido 03/09/26 17:00 | Destino: MP-SG (ATENDER) | Recibido 03/09/26 17:32 | T. recepción 31m | Estado: DERIVADO.")
node("T15", "user", "L_MPSG", 17, "Recibir (17:32) y emitir Proveído N° 029679-2026-UTD-SG/UNMSM a UPRR",
     "Emitido 03/09/26 17:33 | Destino: Rectorado UPRR (ATENDER) | Recibido 04/09/26 15:40 | T. recepción 22h | Estado: DERIVADO.")
node("T16", "user", "L_UPRR", 18, "Recibir (04/09 15:40) y proyectar Resolución Rectoral",
     "La UPRR elabora el proyecto de resolución y lo eleva para firma.")
node("T17", "user", "L_UPRR", 19, "Emitir Resolución Rectoral N° 011678-2026-R/UNMSM",
     "Emitido 16/09/26 18:20 | Destino: UTYC - OSA - SG (ATENDER) | Recibido 17/09/26 09:51 | T. recepción 15h | Estado: DERIVADO.")
node("T18", "user", "L_UTYC", 20, "Recibir RR (17/09 09:51), transcribir y certificar",
     "La UTYC transcribe la Resolución Rectoral y prepara la distribución.")
node("T19", "user", "L_UTYC", 21, "Emitir Hoja de Envío N° 008533-2026-UTYC-OSA-SG/UNMSM",
     "Emitido 17/09/26 18:39 | 1 ORIGINAL (MP-DGA) + 11 COPIAS | Estado origen: RECIBIDO PARCIAL X DESTINO.")
node("GWP", "and", "L_UTYC", 22, "Distribuir original y copias",
     "Envío simultáneo a 12 dependencias destinatarias.")

# --- destinatarios de la HE 008533 (columna 23 = recepción, 24 = fin)
COPIAS = [
    # id, carril, nombre tarea, fin, doc
    ("MPDGA",  "L_MPDGA",  "Recibir ORIGINAL (18/09 11:40) y archivar", "Archivado", "ORIGINAL | Recibido 18/09/26 11:40 | T. recepción 17h | ARCHIVADO."),
    ("MPOGAL", "L_MPOGAL", "Recibir copia (20/09 19:59) y archivar", "Archivado", "COPIA | Recibido 20/09/26 19:59 | T. recepción 3d 1h | ARCHIVADO."),
    ("MPOGPL", "L_MPOGPL", "Recibir copia (18/09 09:31) y archivar", "Archivado", "COPIA | Recibido 18/09/26 09:31 | T. recepción 14h | ARCHIVADO."),
    ("OGE",    "L_OGE",    "Recibir copia (18/09 09:19) y archivar", "Archivado", "COPIA | Recibido 18/09/26 09:19 | T. recepción 14h | ARCHIVADO."),
    ("OCPF",   "L_OCPF",   "Leer copia recibida", None, "COPIA | Sin fecha de recepción | Estado: NO LEÍDO | 42d 4h sin lectura."),
    ("OC",     "L_OC",     "Recibir copia (18/09 11:44) y archivar", "Archivado", "COPIA | Recibido 18/09/26 11:44 | T. recepción 17h | ARCHIVADO."),
    ("MPOT",   "L_MPOT",   "Recibir copia (18/09 12:38) y archivar", "Archivado", "COPIA | Recibido 18/09/26 12:38 | T. recepción 17h | ARCHIVADO."),
    ("UAA",    "L_UAA",    "Recibir copia (21/09 07:52) y archivar", "Archivado", "COPIA | Recibido 21/09/26 07:52 | T. recepción 3d 13h | ARCHIVADO."),
    ("MPOCI",  "L_MPOCI",  "Recibir copia (18/09 09:23) y atender", "Atendido", "COPIA | Recibido 18/09/26 09:23 | T. recepción 14h | ATENDIDO."),
    ("OTAIP",  "L_OTAIP",  "Recibir copia (18/09 09:01) y archivar", "Archivado", "COPIA | Recibido 18/09/26 09:01 | T. recepción 14h | ARCHIVADO."),
]
for cid, lane, name, fin, doc in COPIAS:
    node(f"T_{cid}", "user", lane, 23, name, doc)
    if fin:
        node(f"E_{cid}", "end", lane, 24, {"Archivado": "Copia archivada", "Atendido": "Copia atendida"}[fin] if cid != "MPDGA" else "Original archivado")

# OCPF: plazo vencido (temporizador de borde no interruptor)
node("E_OCPF", "end", "L_OCPF", 24, "Copia leída")
node("BT_OCPF", "timerBoundary", "L_OCPF", 23, "42d 4h sin lectura")
node("T_OCPF2", "user", "L_OCPF", 25, "Alerta: copia NO LEÍDA pendiente",
     "El sistema muestra la copia como NO LEÍDO después de 42d 4h.")
node("E_OCPF2", "end", "L_OCPF", 26, "Pendiente de lectura")

# OGRRHH: recibe copia y deriva con HE 006211
node("T_OGRRHH", "user", "L_OGRRHH", 23, "Recibir copia (18/09 14:41) y derivar",
     "COPIA | Recibido 18/09/26 14:41 | T. recepción 20h | Estado: DERIVADO.")
node("T_OGRRHH2", "user", "L_OGRRHH", 24, "Emitir Hoja de Envío N° 006211-2026-OGRRHH-DGA/UNMSM",
     "Emitido 18/09/26 16:00 | Estado origen: EMITIDO | 1 ORIGINAL (OROS) + 1 COPIA (Gestión y Escalafón).")
node("GWP_RRHH", "and", "L_OGRRHH", 25, "Distribuir")
node("T_OROS", "user", "L_OROS", 26, "Recibir ORIGINAL (18/09 16:40) y archivar",
     "ORIGINAL | Recibido 18/09/26 16:40 | T. recepción 39m | ARCHIVADO.")
node("E_OROS", "end", "L_OROS", 27, "Original archivado")
node("T_OGESC", "user", "L_OGESC", 26, "Recibir copia (18/09 16:22) y archivar",
     "COPIA | Recibido 18/09/26 16:22 | T. recepción 21m | ARCHIVADO.")
node("E_OGESC", "end", "L_OGESC", 27, "Copia archivada")

# FCM: MP-FCM recibe copia, deriva al Decanato, Decanato responde
node("T_MPFCM", "user", "L_MPFCM", 23, "Recibir copia (18/09 06:34) y derivar",
     "COPIA | Recibido 18/09/26 06:34 | T. recepción 11h | Estado: DERIVADO.")
node("T_MPFCM2", "user", "L_MPFCM", 24, "Emitir Hoja de Envío N° 003540-2026-MP-FCM/UNMSM a Decanato",
     "Emitido 18/09/26 06:41 | Destino: Decanato - D - FCM (ORIGINAL) | Recibido 18/09/26 08:44 | T. recepción 2h | Estado: ATENDIDO.")
node("T_DFCM", "user", "L_DFCM", 25, "Recibir (18/09 08:44) y atender",
     "Estado destino: ATENDIDO.")
node("T_DFCM2", "user", "L_DFCM", 26, "Emitir Hoja de Envío N° 002713-2026-D-FCM/UNMSM",
     "Emitido 18/09/26 14:39 | Estado origen: RECIBIDO X DESTINO | ORIGINAL a MP-FCM + COPIA a EPIO.")
node("GWP_FCM", "and", "L_DFCM", 27, "Distribuir")
node("T_MPFCM3", "user", "L_MPFCM", 28, "Recibir ORIGINAL (18/09 15:18)",
     "ORIGINAL | Recibido 18/09/26 15:18 | T. recepción 38m | Estado: RECIBIDO.")
node("E_MPFCM", "end", "L_MPFCM", 29, "Original recibido")
node("T_EPIO", "user", "L_EPIO", 28, "Recibir copia (22/09 14:18)",
     "COPIA | Recibido 22/09/26 14:18 | T. recepción 3d 23h | Estado: RECIBIDO.")
node("E_EPIO", "end", "L_EPIO", 29, "Copia recibida")

NODES = {n["id"]: n for n in N}

# ---------------------------------------------------------------- flujos de secuencia
F = []
def flow(src, tgt, name=""):
    F.append(dict(id=f"SF_{len(F)+1:02d}", src=src, tgt=tgt, name=name))

chain = ["SE_FUT", "T01", "T02", "T03", "GW1"]
for a, b in zip(chain, chain[1:]):
    flow(a, b)
flow("GW1", "T04", "Sí")
chain = ["T04", "T05", "T06", "T07", "T08", "T09", "T10", "T11", "T12", "T13", "GW2"]
for a, b in zip(chain, chain[1:]):
    flow(a, b)
flow("GW1", "GW2", "No")
chain = ["GW2", "T14", "T15", "T16", "T17", "T18", "T19", "GWP"]
for a, b in zip(chain, chain[1:]):
    flow(a, b)
for cid, *_ in COPIAS:
    flow("GWP", f"T_{cid}")
    flow(f"T_{cid}", f"E_{cid}")
flow("BT_OCPF", "T_OCPF2")
flow("T_OCPF2", "E_OCPF2")
flow("GWP", "T_OGRRHH")
for a, b in [("T_OGRRHH", "T_OGRRHH2"), ("T_OGRRHH2", "GWP_RRHH"), ("GWP_RRHH", "T_OROS"),
             ("T_OROS", "E_OROS"), ("GWP_RRHH", "T_OGESC"), ("T_OGESC", "E_OGESC")]:
    flow(a, b)
flow("GWP", "T_MPFCM")
for a, b in [("T_MPFCM", "T_MPFCM2"), ("T_MPFCM2", "T_DFCM"), ("T_DFCM", "T_DFCM2"),
             ("T_DFCM2", "GWP_FCM"), ("GWP_FCM", "T_MPFCM3"), ("T_MPFCM3", "E_MPFCM"),
             ("GWP_FCM", "T_EPIO"), ("T_EPIO", "E_EPIO")]:
    flow(a, b)

# ---------------------------------------------------------------- objetos de datos (documentos emitidos)
DOCS = [  # (id, tarea que lo produce, nombre)
    ("DO_01", "T01", "FUT Virtual N° 00959991/UNMSM"),
    ("DO_02", "T02", "Proveído N° 026121-2026-UTD-SG"),
    ("DO_04", "T04", "Proveído N° 014073-2026-R-D"),
    ("DO_05", "T05", "Proveído N° 002459-2026-DGA"),
    ("DO_06", "T06", "HE N° 003218-2026-MP-OGPL"),
    ("DO_08", "T08", "HE N° 001356-2026-OP-OGPL"),
    ("DO_09", "T09", "Proveído N° 002233-2026-OGPL"),
    ("DO_10", "T10", "Proveído N° 003440-2026-OGE-DGA"),
    ("DO_11", "T11", "Proveído N° 002493-2026-DGA"),
    ("DO_12", "T12", "Proveído N° 029408-2026-UTD-SG"),
    ("DO_14", "T14", "Proveído N° 014311-2026-R-D"),
    ("DO_15", "T15", "Proveído N° 029679-2026-UTD-SG"),
    ("DO_17", "T17", "Resolución Rectoral N° 011678-2026-R"),
    ("DO_19", "T19", "HE N° 008533-2026-UTYC-OSA-SG"),
    ("DO_RRHH", "T_OGRRHH2", "HE N° 006211-2026-OGRRHH-DGA"),
    ("DO_MPFCM", "T_MPFCM2", "HE N° 003540-2026-MP-FCM"),
    ("DO_DFCM", "T_DFCM2", "HE N° 002713-2026-D-FCM"),
]

# ---------------------------------------------------------------- anotaciones
NOTES = [  # (id, nodo asociado, texto, dx, dy) dx/dy relativos a la esquina del nodo
    ("TA_01", "SE_FUT", "Inicio: 10/08/26 09:14\nCanal: Mesa de Partes Virtual", 110, -95),
    ("TA_02", "GW1", "Supuesto de modelado: el SGD sólo registra la rama SÍ (01/09/26).\nEspera en Rectorado: 10/08 12:33 a 01/09 15:45 (22 días).", -40, -110),
    ("TA_03", "T13", "Estado destino: ATENDIDO\nT. recepción del Proveído 029408: 1d 1h", -10, -95),
    ("TA_04", "T17", "Espera en UPRR: 04/09 15:40 a 16/09 18:20 (12 días)", -10, -95),
    ("TA_05", "GWP", "HE 008533: 1 ORIGINAL + 11 COPIAS\nEstado origen: RECIBIDO PARCIAL X DESTINO", 70, -80),
    ("TA_06", "T_OCPF2", "ALERTA: única copia sin leer\n(NO LEÍDO, 42d 4h al 30/10/26)", 0, -95),
    ("TA_07", "GWP_FCM", "Estado origen HE 002713: RECIBIDO X DESTINO", -30, -95),
]

# ---------------------------------------------------------------- geometría de nodos
def lane_top(lid):
    return POOL_Y + LANE_IDX[lid] * LANE_H

def size(kind):
    if kind in ("user",):
        return TASK_W, TASK_H
    if kind in ("xor", "and"):
        return GW, GW
    return EV, EV

def box(n):
    w, h = size(n["kind"])
    cx = COL0_X + n["col"] * COL_W + TASK_W / 2
    cy = lane_top(n["lane"]) + 22 + TASK_H / 2
    if n["kind"] == "timerBoundary":
        t = NODES["T_OCPF"]
        tx, ty, tw, th = box(t)
        return tx + tw - 50, ty + th - EV / 2, EV, EV
    return cx - w / 2, cy - h / 2, w, h

def bounds(x, y, w, h):
    return f'<dc:Bounds x="{x:.0f}" y="{y:.0f}" width="{w:.0f}" height="{h:.0f}" />'

def edge_points(src, tgt):
    sx, sy, sw, sh = box(NODES[src])
    tx, ty, tw, th = box(NODES[tgt])
    scy, tcy = sy + sh / 2, ty + th / 2
    if NODES[src]["kind"] == "timerBoundary":
        # baja por debajo de la tarea y entra por abajo a la tarea de alerta
        yb = lane_top(NODES[src]["lane"]) + LANE_H - 14
        p0 = (sx + sw / 2, sy + sh)
        return [p0, (p0[0], yb), (tx + tw / 2, yb), (tx + tw / 2, ty + th)]
    if (src, tgt) == ("GW1", "GW2"):
        # rama "No": por la parte alta del carril para no cruzar las tareas
        yt = lane_top(NODES[src]["lane"]) + 10
        return [(sx + sw / 2, sy), (sx + sw / 2, yt), (tx + tw / 2, yt), (tx + tw / 2, ty)]
    if abs(scy - tcy) < 1:
        return [(sx + sw, scy), (tx, tcy)]
    if NODES[src]["kind"] in ("xor", "and"):
        # salida por arriba/abajo del rombo y entrada por la izquierda
        p0 = (sx + sw / 2, sy if tcy < scy else sy + sh)
        if tx > sx + sw + 1:
            return [p0, (p0[0], tcy), (tx, tcy)]
    if NODES[tgt]["kind"] in ("xor", "and") and tx > sx + sw:
        # entrada por arriba/abajo del rombo
        p1 = (tx + tw / 2, ty if scy < tcy else ty + th)
        return [(sx + sw, scy), (p1[0], scy), p1]
    xm = (sx + sw + tx) / 2
    return [(sx + sw, scy), (xm, scy), (xm, tcy), (tx, tcy)]

# ---------------------------------------------------------------- XML
def doc_el(text):
    return f"<documentation>{escape(text)}</documentation>" if text else ""

def a(text):
    return escape(text, {'"': "&quot;", "\n": "&#10;"})

incoming = {nid: [] for nid in NODES}
outgoing = {nid: [] for nid in NODES}
for f in F:
    outgoing[f["src"]].append(f["id"])
    incoming[f["tgt"]].append(f["id"])

def io(nid):
    return "".join(f"<incoming>{i}</incoming>" for i in incoming[nid]) + \
           "".join(f"<outgoing>{o}</outgoing>" for o in outgoing[nid])

proc = []
for n in N:
    k, nid, name = n["kind"], n["id"], a(n["name"])
    body = doc_el(n["doc"]) + io(nid)
    if k == "startMsg":
        proc.append(f'<startEvent id="{nid}" name="{name}">{body}<messageEventDefinition id="{nid}_md" /></startEvent>')
    elif k == "user":
        dout = "".join(
            f'<dataOutputAssociation id="DOA_{d}"><targetRef>{d}</targetRef></dataOutputAssociation>'
            for d, t, _ in DOCS if t == nid)
        proc.append(f'<userTask id="{nid}" name="{name}">{body}{dout}</userTask>')
    elif k == "xor":
        proc.append(f'<exclusiveGateway id="{nid}" name="{name}" gatewayDirection="{"Diverging" if len(outgoing[nid]) > 1 else "Converging"}">{body}</exclusiveGateway>')
    elif k == "and":
        proc.append(f'<parallelGateway id="{nid}" name="{name}" gatewayDirection="Diverging">{body}</parallelGateway>')
    elif k == "end":
        proc.append(f'<endEvent id="{nid}" name="{name}">{body}</endEvent>')
    elif k == "timerBoundary":
        proc.append(f'<boundaryEvent id="{nid}" name="{name}" attachedToRef="T_OCPF" cancelActivity="false">{body}'
                    f'<timerEventDefinition id="{nid}_td"><timeDuration xsi:type="tFormalExpression">P42DT4H</timeDuration></timerEventDefinition></boundaryEvent>')
for f in F:
    nm = f' name="{a(f["name"])}"' if f["name"] else ""
    proc.append(f'<sequenceFlow id="{f["id"]}"{nm} sourceRef="{f["src"]}" targetRef="{f["tgt"]}" />')
for d, _, name in DOCS:
    proc.append(f'<dataObjectReference id="{d}" name="{a(name)}" dataObjectRef="{d}_obj" /><dataObject id="{d}_obj" />')
for tid, nid, text, *_ in NOTES:
    proc.append(f'<textAnnotation id="{tid}"><text>{escape(text)}</text></textAnnotation>')
    proc.append(f'<association id="AS_{tid}" sourceRef="{tid}" targetRef="{nid}" />')

lanes_xml = []
for lid, lname in LANES:
    refs = "".join(f"<flowNodeRef>{n['id']}</flowNodeRef>" for n in N if n["lane"] == lid)
    lanes_xml.append(f'<lane id="{lid}" name="{a(lname)}">{refs}</lane>')

# --- pool del administrado
ADM_Y, ADM_H = 40, 170
adm_nodes = [
    ("A_SE", "start", "Necesidad de trámite", COL0_X - 60),
    ("A_T1", "user", "Presentar FUT Virtual por Mesa de Partes Virtual", COL0_X + 40),
    ("A_EE", "end", "FUT presentado", COL0_X + 230),
]
def adm_box(kind, x):
    w, h = size(kind)
    cy = ADM_Y + ADM_H / 2
    return x, cy - h / 2, w, h

adm_proc = (
    '<startEvent id="A_SE" name="Necesidad de trámite"><outgoing>A_SF1</outgoing></startEvent>'
    '<userTask id="A_T1" name="Presentar FUT Virtual por Mesa de Partes Virtual"><incoming>A_SF1</incoming><outgoing>A_SF2</outgoing></userTask>'
    '<endEvent id="A_EE" name="FUT presentado"><incoming>A_SF2</incoming></endEvent>'
    '<sequenceFlow id="A_SF1" sourceRef="A_SE" targetRef="A_T1" />'
    '<sequenceFlow id="A_SF2" sourceRef="A_T1" targetRef="A_EE" />'
)

# ---------------------------------------------------------------- DI
di = []
di.append(f'<bpmndi:BPMNShape id="P_ADM_di" bpmnElement="P_ADM" isHorizontal="true">{bounds(POOL_X, ADM_Y, 900, ADM_H)}</bpmndi:BPMNShape>')
for nid, kind, _, x in adm_nodes:
    di.append(f'<bpmndi:BPMNShape id="{nid}_di" bpmnElement="{nid}">{bounds(*adm_box(kind, x))}</bpmndi:BPMNShape>')
b1, b2, b3 = (adm_box(k, x) for _, k, _, x in adm_nodes)
cy = ADM_Y + ADM_H / 2
di.append(f'<bpmndi:BPMNEdge id="A_SF1_di" bpmnElement="A_SF1"><di:waypoint x="{b1[0]+b1[2]:.0f}" y="{cy:.0f}" /><di:waypoint x="{b2[0]:.0f}" y="{cy:.0f}" /></bpmndi:BPMNEdge>')
di.append(f'<bpmndi:BPMNEdge id="A_SF2_di" bpmnElement="A_SF2"><di:waypoint x="{b2[0]+b2[2]:.0f}" y="{cy:.0f}" /><di:waypoint x="{b3[0]:.0f}" y="{cy:.0f}" /></bpmndi:BPMNEdge>')

di.append(f'<bpmndi:BPMNShape id="P_UNMSM_di" bpmnElement="P_UNMSM" isHorizontal="true">{bounds(POOL_X, POOL_Y, POOL_W, POOL_H)}</bpmndi:BPMNShape>')
for lid, _ in LANES:
    di.append(f'<bpmndi:BPMNShape id="{lid}_di" bpmnElement="{lid}" isHorizontal="true">{bounds(POOL_X + LANE_HDR, lane_top(lid), POOL_W - LANE_HDR, LANE_H)}</bpmndi:BPMNShape>')
for n in N:
    x, y, w, h = box(n)
    marker = ' isMarkerVisible="true"' if n["kind"] == "xor" else ""
    lbl = ""
    if n["kind"] in ("startMsg", "end", "timerBoundary", "xor", "and") and n["name"]:
        ly = y + h + 4
        lx = x - 30 if n["kind"] != "timerBoundary" else x + w
        lbl = f'<bpmndi:BPMNLabel>{bounds(lx, ly, w + 60, 28)}</bpmndi:BPMNLabel>'
    di.append(f'<bpmndi:BPMNShape id="{n["id"]}_di" bpmnElement="{n["id"]}"{marker}>{bounds(x, y, w, h)}{lbl}</bpmndi:BPMNShape>')
for f in F:
    pts = "".join(f'<di:waypoint x="{px:.0f}" y="{py:.0f}" />' for px, py in edge_points(f["src"], f["tgt"]))
    di.append(f'<bpmndi:BPMNEdge id="{f["id"]}_di" bpmnElement="{f["id"]}">{pts}</bpmndi:BPMNEdge>')
for d, t, _ in DOCS:
    tx, ty, tw, th = box(NODES[t])
    dx, dy = tx + tw - DO_W - 4, ty + th + 6
    di.append(f'<bpmndi:BPMNShape id="{d}_di" bpmnElement="{d}">{bounds(dx, dy, DO_W, DO_H)}'
              f'<bpmndi:BPMNLabel>{bounds(dx - 95, dy + 8, 92, 30)}</bpmndi:BPMNLabel></bpmndi:BPMNShape>')
    di.append(f'<bpmndi:BPMNEdge id="DOA_{d}_di" bpmnElement="DOA_{d}"><di:waypoint x="{dx + DO_W/2 + 10:.0f}" y="{ty + th:.0f}" /><di:waypoint x="{dx + DO_W/2:.0f}" y="{dy:.0f}" /></bpmndi:BPMNEdge>')
for tid, nid, text, ddx, ddy in NOTES:
    x, y, w, h = box(NODES[nid])
    ax, ay = x + ddx, y + ddy
    aw, ah = 230, 52
    di.append(f'<bpmndi:BPMNShape id="{tid}_di" bpmnElement="{tid}">{bounds(ax, ay, aw, ah)}</bpmndi:BPMNShape>')
    di.append(f'<bpmndi:BPMNEdge id="AS_{tid}_di" bpmnElement="AS_{tid}"><di:waypoint x="{ax + 20:.0f}" y="{ay + ah:.0f}" /><di:waypoint x="{x + w/2:.0f}" y="{y:.0f}" /></bpmndi:BPMNEdge>')
# flujo de mensaje administrado -> inicio
sx, sy, sw, sh = box(NODES["SE_FUT"])
di.append(f'<bpmndi:BPMNEdge id="MF_01_di" bpmnElement="MF_01"><di:waypoint x="{b2[0]+b2[2]/2:.0f}" y="{b2[1]+b2[3]:.0f}" />'
          f'<di:waypoint x="{b2[0]+b2[2]/2:.0f}" y="{sy - 40:.0f}" /><di:waypoint x="{sx+sw/2:.0f}" y="{sy - 40:.0f}" /><di:waypoint x="{sx+sw/2:.0f}" y="{sy:.0f}" /></bpmndi:BPMNEdge>')

xml = f'''<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  id="DEF_FUT_00959991" targetNamespace="http://unmsm.edu.pe/bpmn/fut00959991"
  exporter="generar_bpmn.py" exporterVersion="1.0">
<collaboration id="COLAB_FUT">
<documentation>Trazabilidad del expediente FUT Virtual N° 00959991/UNMSM en el Sistema de Gestión Documental de la UNMSM (10/08/26 al 30/10/26).</documentation>
<participant id="P_ADM" name="Administrado / Solicitante" processRef="PROC_ADM" />
<participant id="P_UNMSM" name="UNMSM - Trámite del FUT Virtual N° 00959991 (SGD)" processRef="PROC_UNMSM" />
<messageFlow id="MF_01" name="FUT Virtual" sourceRef="A_T1" targetRef="SE_FUT" />
</collaboration>
<process id="PROC_ADM" name="Administrado" isExecutable="false">{adm_proc}</process>
<process id="PROC_UNMSM" name="Trámite FUT Virtual N° 00959991" isExecutable="false">
<laneSet id="LS_UNMSM">{"".join(lanes_xml)}</laneSet>
{chr(10).join(proc)}
</process>
<bpmndi:BPMNDiagram id="DIAG_FUT" name="Flujo FUT Virtual N° 00959991">
<bpmndi:BPMNPlane id="PLANE_FUT" bpmnElement="COLAB_FUT">
{chr(10).join(di)}
</bpmndi:BPMNPlane>
</bpmndi:BPMNDiagram>
</definitions>
'''
out = Path(__file__).with_name("flujo_FUT_00959991.bpmn")
out.write_text(xml, encoding="utf-8")
print(f"{out}  ({len(N)} nodos, {len(F)} flujos, {len(LANES)} carriles)")
