{
  "patcher": {
    "fileversion": 1,
    "rect": [
      80,
      80,
      465,
      240
    ],
    "boxes": [
      {
        "box": {
          "id": "udp",
          "maxclass": "newobj",
          "patching_rect": [
            30,
            36,
            110,
            24
          ],
          "text": "udpreceive 9000"
        }
      },
      {
        "box": {
          "id": "route",
          "maxclass": "newobj",
          "patching_rect": [
            30,
            88,
            255,
            24
          ],
          "text": "route /platform/trigger /platform/value"
        }
      },
      {
        "box": {
          "id": "bang",
          "maxclass": "button",
          "patching_rect": [
            30,
            148,
            24,
            24
          ]
        }
      },
      {
        "box": {
          "id": "value",
          "maxclass": "flonum",
          "patching_rect": [
            155,
            148,
            85,
            24
          ]
        }
      },
      {
        "box": {
          "id": "log",
          "maxclass": "newobj",
          "patching_rect": [
            275,
            148,
            125,
            24
          ],
          "text": "print platformOSC"
        }
      }
    ],
    "lines": [
      {
        "patchline": {
          "source": [
            "udp",
            0
          ],
          "destination": [
            "route",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "route",
            0
          ],
          "destination": [
            "bang",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "route",
            1
          ],
          "destination": [
            "value",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "udp",
            0
          ],
          "destination": [
            "log",
            0
          ]
        }
      }
    ]
  }
}
