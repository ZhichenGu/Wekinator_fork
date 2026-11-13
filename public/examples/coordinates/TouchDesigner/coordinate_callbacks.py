# Paste into the callbacks DAT belonging to MQTT Client DAT or Serial DAT.
# Create a Table DAT named coordinates beside the receiving operator.
# MQTT accepts JSON from Platform; configure host, TCP/TLS port and credentials
# on the MQTT Client DAT. The WSS URL used by Platform is a separate endpoint.
import json
import time

def write_frame(dat, payload):
    try:
        if isinstance(payload, (bytes, bytearray)):
            payload = payload.decode('utf-8')
        frame = json.loads(payload)
        table = dat.parent().op('coordinates')
        if table is None:
            raise ValueError('Create Table DAT coordinates beside receiver')
        rows = [['mode', 'id', 'x', 'y', 'z', 'received_seconds']]
        now = time.monotonic()
        for point in frame['points']:
            rows.append([frame['mode'], point['id'], point['x'], point['y'], point.get('z', ''), now])
        table.clear()
        for row in rows:
            table.appendRow(row)
    except (ValueError, KeyError, TypeError) as error:
        debug(str(error))

def onConnect(dat):
    dat.subscribe('platform/coordinates')

def onMessage(dat, topic, payload, qos, retained, dup):
    write_frame(dat, payload)

def onReceive(dat, rowIndex, message, bytes=None):
    write_frame(dat, message)
