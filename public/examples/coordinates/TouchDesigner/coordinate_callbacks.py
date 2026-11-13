# Paste into the callbacks DAT belonging to MQTT Client DAT or Serial DAT.
# Create a Table DAT named coordinates beside the receiving operator.
# MQTT Network Address supports tcp://, ssl://, ws:// or wss:// as supported
# by your TouchDesigner build and broker. Keep certificate verification enabled.
import json
import math
import re
import time

TOPIC = 'platform/coordinates'  # Must match Platform; change for each group.
CHANNEL = re.compile(r'^[A-Za-z][A-Za-z0-9_]{0,15}_[xyz]$')

def number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)

def write_frame(dat, payload):
    try:
        if isinstance(payload, (bytes, bytearray)):
            payload = payload.decode('utf-8')
        frame = json.loads(payload)
        if not isinstance(frame, dict) or frame.get('mode') not in ('hand', 'face', 'pose'):
            raise ValueError('Invalid coordinate mode')
        now = time.monotonic()
        if 'values' in frame:
            values = frame['values']
            if not isinstance(values, dict) or not 1 <= len(values) <= 126 or any(
                not CHANNEL.fullmatch(key) or not number(value) for key, value in values.items()
            ):
                raise ValueError('Invalid named coordinates')
            rows = [['channel', 'value', 'received_seconds']]
            rows.extend([channel, value, now] for channel, value in values.items())
        else:
            points = frame.get('points')
            if not isinstance(points, list) or not 1 <= len(points) <= 42:
                raise ValueError('Invalid coordinate points')
            rows = [['mode', 'id', 'x', 'y', 'z', 'received_seconds']]
            for point in points:
                if not isinstance(point, dict) or type(point.get('id')) is not int or not 0 <= point['id'] <= 477 or any(
                    not number(point.get(axis)) for axis in ('x', 'y')
                ) or ('z' in point and not number(point['z'])):
                    raise ValueError('Invalid coordinate point')
                rows.append([frame['mode'], point['id'], point['x'], point['y'], point.get('z', ''), now])
        table = dat.parent().op('coordinates')
        if table is None:
            raise ValueError('Create Table DAT coordinates beside receiver')
        # Validate the complete frame before replacing the last good table.
        table.clear()
        for row in rows:
            table.appendRow(row)
    except (ValueError, KeyError, TypeError, UnicodeError) as error:
        debug(str(error))

def onConnect(dat):
    dat.subscribe(TOPIC)

def onMessage(dat, topic, payload, qos, retained, dup):
    if topic == TOPIC and not retained:
        write_frame(dat, payload)

def onReceive(dat, rowIndex, message, bytes=None):
    write_frame(dat, message)
