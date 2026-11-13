#!/usr/bin/env python3
"""Controlled-input tests for the downloadable TouchDesigner callbacks (no TD runtime)."""
from pathlib import Path
import json
import types
import unittest

class Table:
    def __init__(self): self.rows = []
    def clear(self): self.rows = []
    def appendRow(self, row): self.rows.append(row)

class Receiver:
    def __init__(self): self.table, self.topics = Table(), []
    def parent(self): return self
    def op(self, name): return self.table if name == 'coordinates' else None
    def subscribe(self, topic): self.topics.append(topic)

class CallbackTests(unittest.TestCase):
    def setUp(self):
        self.module = types.ModuleType('callbacks')
        self.errors = []
        self.module.debug = self.errors.append
        file = Path(__file__).resolve().parents[1] / 'public/examples/coordinates/TouchDesigner/coordinate_callbacks.py'
        exec(compile(file.read_text(), str(file), 'exec'), self.module.__dict__)
        self.dat = Receiver()
    def test_named_and_legacy_frames(self):
        for mode in ('hand', 'face', 'pose'):
            self.module.onReceive(self.dat, 0, json.dumps({'mode': mode, 'values': {'test_x': .2}}))
            self.assertEqual(self.dat.table.rows[1][:2], ['test_x', .2])
            self.assertGreater(self.dat.table.rows[1][2], 0)
        self.module.write_frame(self.dat, b'{"mode":"hand","points":[{"id":8,"x":0.2,"y":0.3}]}')
        self.assertEqual(self.dat.table.rows[1][:5], ['hand', 8, .2, .3, ''])
    def test_invalid_frames_do_not_replace_last_good_values_or_timestamp(self):
        self.module.write_frame(self.dat, '{"mode":"hand","values":{"index_tip_x":0.4}}')
        before = list(self.dat.table.rows)
        for payload in ['null', '{"mode":"hand","values":null}', '{"mode":"hand","values":{"index_tip_x":NaN}}', '{"mode":"hand","values":{"index_tip_x":"0.4"}}', '{"mode":"hand","points":[{}]}', '{"mode":"unknown","values":{"test_x":0.2}}', b'\xff']:
            self.module.write_frame(self.dat, payload)
            self.assertEqual(self.dat.table.rows, before)
        self.assertEqual(len(self.errors), 7)
    def test_full_two_hand_frame(self):
        values = {f'{side}_point_{point}_{axis}': .25 for side in ('left', 'right') for point in range(21) for axis in ('x', 'y', 'z')}
        self.module.write_frame(self.dat, json.dumps({'mode': 'hand', 'values': values}))
        self.assertEqual(len(self.dat.table.rows), 127)
        self.assertEqual(self.errors, [])

    def test_topic_and_retained_messages(self):
        self.module.TOPIC = 'class/group/coordinates'
        self.module.onConnect(self.dat)
        self.assertEqual(self.dat.topics, ['class/group/coordinates'])
        payload = '{"mode":"hand","values":{"index_tip_x":0.4}}'
        self.module.onMessage(self.dat, 'wrong/topic', payload, 0, False, False)
        self.module.onMessage(self.dat, self.module.TOPIC, payload, 0, True, False)
        self.assertEqual(self.dat.table.rows, [])
        self.module.onMessage(self.dat, self.module.TOPIC, payload, 0, False, False)
        self.assertEqual(self.dat.table.rows[1][:2], ['index_tip_x', .4])

if __name__ == '__main__': unittest.main()
