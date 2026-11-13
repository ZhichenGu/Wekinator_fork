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
          "text": "Named axes: UDP 9000, /platform/hand/index_tip/x (and y, z)",
          "patching_rect": [
            25,
            20,
            700,
            24
          ]
        }
      },
      {
        "box": {
          "id": "in",
          "maxclass": "newobj",
          "text": "udpreceive 9000",
          "patching_rect": [
            25,
            65,
            280,
            24
          ]
        }
      },
      {
        "box": {
          "id": "route",
          "maxclass": "newobj",
          "text": "route /platform/hand/index_tip/x /platform/hand/index_tip/y /platform/hand/index_tip/z",
          "patching_rect": [
            25,
            110,
            710,
            24
          ]
        }
      },
      {
        "box": {
          "id": "print",
          "maxclass": "newobj",
          "text": "print PlatformCoordinates",
          "patching_rect": [
            360,
            110,
            280,
            24
          ]
        }
      },
      {
        "box": {
          "id": "label0",
          "maxclass": "comment",
          "text": "X",
          "patching_rect": [
            25,
            205,
            160,
            24
          ]
        }
      },
      {
        "box": {
          "id": "num0",
          "maxclass": "flonum",
          "patching_rect": [
            25,
            240,
            140,
            24
          ]
        }
      },
      {
        "box": {
          "id": "label1",
          "maxclass": "comment",
          "text": "Y",
          "patching_rect": [
            205,
            205,
            160,
            24
          ]
        }
      },
      {
        "box": {
          "id": "num1",
          "maxclass": "flonum",
          "patching_rect": [
            205,
            240,
            140,
            24
          ]
        }
      },
      {
        "box": {
          "id": "label2",
          "maxclass": "comment",
          "text": "Z (XYZ only)",
          "patching_rect": [
            385,
            205,
            160,
            24
          ]
        }
      },
      {
        "box": {
          "id": "num2",
          "maxclass": "flonum",
          "patching_rect": [
            385,
            240,
            140,
            24
          ]
        }
      },
      {
        "box": {
          "id": "loss",
          "maxclass": "comment",
          "text": "Numbers hold their last value on loss. Add a receiver timeout for installations.",
          "patching_rect": [
            25,
            300,
            700,
            24
          ]
        }
      }
    ],
    "lines": [
      {
        "patchline": {
          "source": [
            "in",
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
            "in",
            0
          ],
          "destination": [
            "print",
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
            "num0",
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
            "num1",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "route",
            2
          ],
          "destination": [
            "num2",
            0
          ]
        }
      }
    ]
  }
}
