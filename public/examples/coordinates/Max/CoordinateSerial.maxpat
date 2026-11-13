{
  "patcher": {
    "fileversion": 1,
    "appversion": {
      "major": 8,
      "minor": 6,
      "revision": 0,
      "architecture": "x64"
    },
    "rect": [
      100,
      100,
      780,
      520
    ],
    "boxes": [
      {
        "box": {
          "id": "note",
          "maxclass": "comment",
          "text": "Serial JSON: choose receiving port; 115200 baud, LF. Requires virtual port pair or device relay.",
          "patching_rect": [
            25,
            20,
            720,
            24
          ]
        }
      },
      {
        "box": {
          "id": "toggle",
          "maxclass": "toggle",
          "patching_rect": [
            25,
            65,
            24,
            24
          ]
        }
      },
      {
        "box": {
          "id": "poll",
          "maxclass": "newobj",
          "text": "qmetro 5",
          "patching_rect": [
            25,
            110,
            280,
            24
          ]
        }
      },
      {
        "box": {
          "id": "serial",
          "maxclass": "newobj",
          "text": "serial a 115200",
          "patching_rect": [
            25,
            155,
            280,
            24
          ]
        }
      },
      {
        "box": {
          "id": "ports",
          "maxclass": "message",
          "text": "print",
          "patching_rect": [
            350,
            155,
            80,
            24
          ]
        }
      },
      {
        "box": {
          "id": "parse",
          "maxclass": "newobj",
          "text": "js coordinate_serial.js",
          "patching_rect": [
            25,
            200,
            280,
            24
          ]
        }
      },
      {
        "box": {
          "id": "n0",
          "maxclass": "flonum",
          "patching_rect": [
            25,
            260,
            120,
            24
          ]
        }
      },
      {
        "box": {
          "id": "n1",
          "maxclass": "flonum",
          "patching_rect": [
            175,
            260,
            120,
            24
          ]
        }
      },
      {
        "box": {
          "id": "n2",
          "maxclass": "flonum",
          "patching_rect": [
            325,
            260,
            120,
            24
          ]
        }
      },
      {
        "box": {
          "id": "n3",
          "maxclass": "flonum",
          "patching_rect": [
            475,
            260,
            120,
            24
          ]
        }
      }
    ],
    "lines": [
      {
        "patchline": {
          "source": [
            "toggle",
            0
          ],
          "destination": [
            "poll",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "poll",
            0
          ],
          "destination": [
            "serial",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "ports",
            0
          ],
          "destination": [
            "serial",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "serial",
            0
          ],
          "destination": [
            "parse",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "parse",
            0
          ],
          "destination": [
            "n0",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "parse",
            1
          ],
          "destination": [
            "n1",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "parse",
            2
          ],
          "destination": [
            "n2",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "parse",
            3
          ],
          "destination": [
            "n3",
            0
          ]
        }
      }
    ]
  }
}
