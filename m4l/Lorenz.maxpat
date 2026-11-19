{
  "patcher": {
    "fileversion": 1,
    "appversion": {
      "major": 8,
      "minor": 6,
      "revision": 0,
      "architecture": "x64",
      "modernui": 1
    },
    "classnamespace": "box",
    "rect": [
      80,
      80,
      1100,
      780
    ],
    "bglocked": 0,
    "openinpresentation": 1,
    "default_fontsize": 11,
    "default_fontname": "Arial",
    "gridsize": [
      15,
      15
    ],
    "boxes": [
      {
        "box": {
          "id": "obj-1",
          "maxclass": "comment",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            30,
            20,
            280,
            24
          ],
          "text": "Lorenz — chaotic sequencer",
          "fontsize": 14,
          "presentation": 1,
          "presentation_rect": [
            20,
            12,
            300,
            24
          ]
        }
      },
      {
        "box": {
          "id": "obj-2",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 2,
          "patching_rect": [
            30,
            280,
            120,
            22
          ],
          "saved_attribute_attributes": {
            "valueof": {
              "parameter_enable": 0
            }
          },
          "outlettype": [
            "",
            ""
          ],
          "text": "js lorenz.js"
        }
      },
      {
        "box": {
          "id": "obj-3",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 1,
          "patching_rect": [
            30,
            320,
            70,
            22
          ],
          "outlettype": [
            ""
          ],
          "text": "midiformat"
        }
      },
      {
        "box": {
          "id": "obj-4",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            30,
            350,
            50,
            22
          ],
          "text": "midiout"
        }
      },
      {
        "box": {
          "id": "obj-5",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            200,
            320,
            60,
            22
          ],
          "text": "print lorenz"
        }
      },
      {
        "box": {
          "id": "obj-6",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 1,
          "patching_rect": [
            30,
            80,
            280,
            22
          ],
          "outlettype": [
            ""
          ],
          "text": "live.observer @path live_set @property is_playing"
        }
      },
      {
        "box": {
          "id": "obj-7",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 1,
          "patching_rect": [
            30,
            110,
            260,
            22
          ],
          "outlettype": [
            ""
          ],
          "text": "live.observer @path live_set @property tempo"
        }
      },
      {
        "box": {
          "id": "obj-8",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 1,
          "patching_rect": [
            30,
            140,
            320,
            22
          ],
          "outlettype": [
            ""
          ],
          "text": "live.observer @path live_set @property current_song_time"
        }
      },
      {
        "box": {
          "id": "obj-9",
          "maxclass": "message",
          "numinlets": 2,
          "numoutlets": 1,
          "patching_rect": [
            340,
            80,
            70,
            22
          ],
          "outlettype": [
            ""
          ],
          "text": "playing $1"
        }
      },
      {
        "box": {
          "id": "obj-10",
          "maxclass": "message",
          "numinlets": 2,
          "numoutlets": 1,
          "patching_rect": [
            340,
            110,
            60,
            22
          ],
          "outlettype": [
            ""
          ],
          "text": "tempo $1"
        }
      },
      {
        "box": {
          "id": "obj-11",
          "maxclass": "message",
          "numinlets": 2,
          "numoutlets": 1,
          "patching_rect": [
            360,
            140,
            60,
            22
          ],
          "outlettype": [
            ""
          ],
          "text": "beats $1"
        }
      },
      {
        "box": {
          "id": "obj-12",
          "maxclass": "live.toggle",
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            "int"
          ],
          "patching_rect": [
            500,
            200,
            24,
            24
          ],
          "presentation": 1,
          "presentation_rect": [
            20,
            50,
            24,
            24
          ],
          "varname": "voice1",
          "parameter_enable": 1
        }
      },
      {
        "box": {
          "id": "obj-13",
          "maxclass": "comment",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            530,
            200,
            100,
            20
          ],
          "presentation": 1,
          "presentation_rect": [
            48,
            52,
            100,
            20
          ],
          "text": "Voice 1 bass"
        }
      },
      {
        "box": {
          "id": "obj-14",
          "maxclass": "message",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            640,
            200,
            140,
            22
          ],
          "text": "set voice1Enable $1"
        }
      },
      {
        "box": {
          "id": "obj-15",
          "maxclass": "live.toggle",
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            "int"
          ],
          "patching_rect": [
            500,
            230,
            24,
            24
          ],
          "presentation": 1,
          "presentation_rect": [
            20,
            80,
            24,
            24
          ],
          "varname": "voice2",
          "parameter_enable": 1
        }
      },
      {
        "box": {
          "id": "obj-16",
          "maxclass": "comment",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            530,
            230,
            100,
            20
          ],
          "presentation": 1,
          "presentation_rect": [
            48,
            82,
            100,
            20
          ],
          "text": "Voice 2 lead"
        }
      },
      {
        "box": {
          "id": "obj-17",
          "maxclass": "message",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            640,
            230,
            140,
            22
          ],
          "text": "set voice2Enable $1"
        }
      },
      {
        "box": {
          "id": "obj-18",
          "maxclass": "live.toggle",
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            "int"
          ],
          "patching_rect": [
            500,
            260,
            24,
            24
          ],
          "presentation": 1,
          "presentation_rect": [
            20,
            110,
            24,
            24
          ],
          "varname": "voice3",
          "parameter_enable": 1
        }
      },
      {
        "box": {
          "id": "obj-19",
          "maxclass": "comment",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            530,
            260,
            100,
            20
          ],
          "presentation": 1,
          "presentation_rect": [
            48,
            112,
            100,
            20
          ],
          "text": "Voice 3 perc"
        }
      },
      {
        "box": {
          "id": "obj-20",
          "maxclass": "message",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            640,
            260,
            140,
            22
          ],
          "text": "set voice3Enable $1"
        }
      },
      {
        "box": {
          "id": "obj-21",
          "maxclass": "live.toggle",
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            "int"
          ],
          "patching_rect": [
            500,
            400,
            24,
            24
          ],
          "presentation": 1,
          "presentation_rect": [
            160,
            50,
            24,
            24
          ],
          "varname": "quantize",
          "parameter_enable": 1
        }
      },
      {
        "box": {
          "id": "obj-22",
          "maxclass": "comment",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            530,
            400,
            100,
            20
          ],
          "presentation": 1,
          "presentation_rect": [
            188,
            52,
            100,
            20
          ],
          "text": "Quantize"
        }
      },
      {
        "box": {
          "id": "obj-23",
          "maxclass": "message",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            640,
            400,
            140,
            22
          ],
          "text": "set quantize $1"
        }
      },
      {
        "box": {
          "id": "obj-24",
          "maxclass": "live.dial",
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            "float"
          ],
          "patching_rect": [
            500,
            430,
            40,
            40
          ],
          "presentation": 1,
          "presentation_rect": [
            160,
            90,
            40,
            40
          ],
          "varname": "speed",
          "parameter_enable": 1,
          "parameter_mmin": 0.2,
          "parameter_mmax": 8
        }
      },
      {
        "box": {
          "id": "obj-25",
          "maxclass": "comment",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            550,
            430,
            80,
            20
          ],
          "presentation": 1,
          "presentation_rect": [
            160,
            132,
            80,
            20
          ],
          "text": "Speed"
        }
      },
      {
        "box": {
          "id": "obj-26",
          "maxclass": "message",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            640,
            430,
            120,
            22
          ],
          "text": "set speed $1"
        }
      },
      {
        "box": {
          "id": "obj-27",
          "maxclass": "live.dial",
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            "float"
          ],
          "patching_rect": [
            500,
            480,
            40,
            40
          ],
          "presentation": 1,
          "presentation_rect": [
            220,
            90,
            40,
            40
          ],
          "varname": "timing",
          "parameter_enable": 1,
          "parameter_mmin": 0,
          "parameter_mmax": 1
        }
      },
      {
        "box": {
          "id": "obj-28",
          "maxclass": "comment",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            550,
            480,
            80,
            20
          ],
          "presentation": 1,
          "presentation_rect": [
            220,
            132,
            80,
            20
          ],
          "text": "Timing"
        }
      },
      {
        "box": {
          "id": "obj-29",
          "maxclass": "message",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            640,
            480,
            120,
            22
          ],
          "text": "set timingInfluence $1"
        }
      },
      {
        "box": {
          "id": "obj-30",
          "maxclass": "live.text",
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            "int"
          ],
          "patching_rect": [
            500,
            530,
            70,
            24
          ],
          "presentation": 1,
          "presentation_rect": [
            20,
            150,
            60,
            24
          ],
          "text": "Reset",
          "texton": "Reset",
          "varname": "resetBtn",
          "parameter_enable": 1,
          "mode": 1
        }
      },
      {
        "box": {
          "id": "obj-31",
          "maxclass": "newobj",
          "text": "sel 1",
          "numinlets": 2,
          "numoutlets": 2,
          "outlettype": [
            "bang",
            ""
          ],
          "patching_rect": [
            580,
            530,
            40,
            22
          ]
        }
      },
      {
        "box": {
          "id": "obj-32",
          "maxclass": "message",
          "text": "reset",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            630,
            530,
            60,
            22
          ]
        }
      },
      {
        "box": {
          "id": "obj-33",
          "maxclass": "live.text",
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            "int"
          ],
          "patching_rect": [
            500,
            560,
            70,
            24
          ],
          "presentation": 1,
          "presentation_rect": [
            90,
            150,
            70,
            24
          ],
          "text": "Perturb",
          "texton": "Perturb",
          "varname": "perturbBtn",
          "parameter_enable": 1,
          "mode": 1
        }
      },
      {
        "box": {
          "id": "obj-34",
          "maxclass": "newobj",
          "text": "sel 1",
          "numinlets": 2,
          "numoutlets": 2,
          "outlettype": [
            "bang",
            ""
          ],
          "patching_rect": [
            580,
            560,
            40,
            22
          ]
        }
      },
      {
        "box": {
          "id": "obj-35",
          "maxclass": "message",
          "text": "perturb",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            630,
            560,
            60,
            22
          ]
        }
      },
      {
        "box": {
          "id": "obj-36",
          "maxclass": "live.menu",
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            "int"
          ],
          "patching_rect": [
            500,
            600,
            120,
            22
          ],
          "presentation": 1,
          "presentation_rect": [
            20,
            200,
            140,
            22
          ],
          "varname": "system",
          "parameter_enable": 1,
          "parameter_enum": [
            "lorenz",
            "chua",
            "rossler",
            "thomas",
            "aizawa",
            "halvorsen",
            "rabinovich"
          ]
        }
      },
      {
        "box": {
          "id": "obj-37",
          "maxclass": "comment",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            630,
            600,
            60,
            20
          ],
          "presentation": 1,
          "presentation_rect": [
            20,
            184,
            80,
            16
          ],
          "text": "System"
        }
      },
      {
        "box": {
          "id": "obj-38",
          "maxclass": "newobj",
          "text": "sel 0 1 2 3 4 5 6",
          "numinlets": 8,
          "numoutlets": 8,
          "outlettype": [
            "bang",
            "bang",
            "bang",
            "bang",
            "bang",
            "bang",
            "bang",
            ""
          ],
          "patching_rect": [
            500,
            630,
            200,
            22
          ]
        }
      },
      {
        "box": {
          "id": "obj-39",
          "maxclass": "message",
          "text": "set systemId lorenz",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            500,
            660,
            100,
            22
          ]
        }
      },
      {
        "box": {
          "id": "obj-40",
          "maxclass": "message",
          "text": "set systemId chua",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            610,
            660,
            100,
            22
          ]
        }
      },
      {
        "box": {
          "id": "obj-41",
          "maxclass": "message",
          "text": "set systemId rossler",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            720,
            660,
            100,
            22
          ]
        }
      },
      {
        "box": {
          "id": "obj-42",
          "maxclass": "message",
          "text": "set systemId thomas",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            830,
            660,
            100,
            22
          ]
        }
      },
      {
        "box": {
          "id": "obj-43",
          "maxclass": "message",
          "text": "set systemId aizawa",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            500,
            685,
            100,
            22
          ]
        }
      },
      {
        "box": {
          "id": "obj-44",
          "maxclass": "message",
          "text": "set systemId halvorsen",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            610,
            685,
            100,
            22
          ]
        }
      },
      {
        "box": {
          "id": "obj-45",
          "maxclass": "message",
          "text": "set systemId rabinovich",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            720,
            685,
            100,
            22
          ]
        }
      },
      {
        "box": {
          "id": "obj-46",
          "maxclass": "live.menu",
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            "int"
          ],
          "patching_rect": [
            500,
            720,
            120,
            22
          ],
          "presentation": 1,
          "presentation_rect": [
            180,
            200,
            80,
            22
          ],
          "varname": "root",
          "parameter_enable": 1,
          "parameter_enum": [
            "C",
            "C#",
            "D",
            "D#",
            "E",
            "F",
            "F#",
            "G",
            "G#",
            "A",
            "A#",
            "B"
          ]
        }
      },
      {
        "box": {
          "id": "obj-47",
          "maxclass": "comment",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            630,
            720,
            60,
            20
          ],
          "presentation": 1,
          "presentation_rect": [
            180,
            184,
            80,
            16
          ],
          "text": "Root"
        }
      },
      {
        "box": {
          "id": "obj-48",
          "maxclass": "newobj",
          "text": "sel 0 1 2 3 4 5 6 7 8 9 10 11",
          "numinlets": 13,
          "numoutlets": 13,
          "outlettype": [
            "bang",
            "bang",
            "bang",
            "bang",
            "bang",
            "bang",
            "bang",
            "bang",
            "bang",
            "bang",
            "bang",
            "bang",
            ""
          ],
          "patching_rect": [
            500,
            750,
            200,
            22
          ]
        }
      },
      {
        "box": {
          "id": "obj-49",
          "maxclass": "message",
          "text": "set root C",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            500,
            780,
            100,
            22
          ]
        }
      },
      {
        "box": {
          "id": "obj-50",
          "maxclass": "message",
          "text": "set root C#",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            610,
            780,
            100,
            22
          ]
        }
      },
      {
        "box": {
          "id": "obj-51",
          "maxclass": "message",
          "text": "set root D",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            720,
            780,
            100,
            22
          ]
        }
      },
      {
        "box": {
          "id": "obj-52",
          "maxclass": "message",
          "text": "set root D#",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            830,
            780,
            100,
            22
          ]
        }
      },
      {
        "box": {
          "id": "obj-53",
          "maxclass": "message",
          "text": "set root E",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            500,
            805,
            100,
            22
          ]
        }
      },
      {
        "box": {
          "id": "obj-54",
          "maxclass": "message",
          "text": "set root F",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            610,
            805,
            100,
            22
          ]
        }
      },
      {
        "box": {
          "id": "obj-55",
          "maxclass": "message",
          "text": "set root F#",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            720,
            805,
            100,
            22
          ]
        }
      },
      {
        "box": {
          "id": "obj-56",
          "maxclass": "message",
          "text": "set root G",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            830,
            805,
            100,
            22
          ]
        }
      },
      {
        "box": {
          "id": "obj-57",
          "maxclass": "message",
          "text": "set root G#",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            500,
            830,
            100,
            22
          ]
        }
      },
      {
        "box": {
          "id": "obj-58",
          "maxclass": "message",
          "text": "set root A",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            610,
            830,
            100,
            22
          ]
        }
      },
      {
        "box": {
          "id": "obj-59",
          "maxclass": "message",
          "text": "set root A#",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            720,
            830,
            100,
            22
          ]
        }
      },
      {
        "box": {
          "id": "obj-60",
          "maxclass": "message",
          "text": "set root B",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            830,
            830,
            100,
            22
          ]
        }
      },
      {
        "box": {
          "id": "obj-61",
          "maxclass": "live.menu",
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            "int"
          ],
          "patching_rect": [
            500,
            840,
            120,
            22
          ],
          "presentation": 1,
          "presentation_rect": [
            280,
            200,
            140,
            22
          ],
          "varname": "scale",
          "parameter_enable": 1,
          "parameter_enum": [
            "pentatonic-minor",
            "pentatonic-major",
            "minor",
            "major",
            "whole-tone",
            "chromatic"
          ]
        }
      },
      {
        "box": {
          "id": "obj-62",
          "maxclass": "comment",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            630,
            840,
            60,
            20
          ],
          "presentation": 1,
          "presentation_rect": [
            280,
            184,
            80,
            16
          ],
          "text": "Scale"
        }
      },
      {
        "box": {
          "id": "obj-63",
          "maxclass": "newobj",
          "text": "sel 0 1 2 3 4 5",
          "numinlets": 7,
          "numoutlets": 7,
          "outlettype": [
            "bang",
            "bang",
            "bang",
            "bang",
            "bang",
            "bang",
            ""
          ],
          "patching_rect": [
            500,
            870,
            200,
            22
          ]
        }
      },
      {
        "box": {
          "id": "obj-64",
          "maxclass": "message",
          "text": "set scale pentatonic-minor",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            500,
            900,
            100,
            22
          ]
        }
      },
      {
        "box": {
          "id": "obj-65",
          "maxclass": "message",
          "text": "set scale pentatonic-major",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            610,
            900,
            100,
            22
          ]
        }
      },
      {
        "box": {
          "id": "obj-66",
          "maxclass": "message",
          "text": "set scale minor",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            720,
            900,
            100,
            22
          ]
        }
      },
      {
        "box": {
          "id": "obj-67",
          "maxclass": "message",
          "text": "set scale major",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            830,
            900,
            100,
            22
          ]
        }
      },
      {
        "box": {
          "id": "obj-68",
          "maxclass": "message",
          "text": "set scale whole-tone",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            500,
            925,
            100,
            22
          ]
        }
      },
      {
        "box": {
          "id": "obj-69",
          "maxclass": "message",
          "text": "set scale chromatic",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            610,
            925,
            100,
            22
          ]
        }
      },
      {
        "box": {
          "id": "obj-70",
          "maxclass": "comment",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            30,
            180,
            400,
            40
          ],
          "presentation": 1,
          "presentation_rect": [
            20,
            240,
            400,
            36
          ],
          "text": "MIDI effect — play Live transport. Drop before an instrument. Build JS with: npm run build:m4l"
        }
      },
      {
        "box": {
          "id": "obj-71",
          "maxclass": "newobj",
          "text": "loadbang",
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            "bang"
          ],
          "patching_rect": [
            20,
            400,
            60,
            22
          ]
        }
      },
      {
        "box": {
          "id": "obj-72",
          "maxclass": "message",
          "text": "1",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            20,
            430,
            32,
            22
          ]
        }
      }
    ],
    "lines": [
      {
        "patchline": {
          "source": [
            "obj-2",
            0
          ],
          "destination": [
            "obj-3",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-3",
            0
          ],
          "destination": [
            "obj-4",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-2",
            1
          ],
          "destination": [
            "obj-5",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-6",
            0
          ],
          "destination": [
            "obj-9",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-7",
            0
          ],
          "destination": [
            "obj-10",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-8",
            0
          ],
          "destination": [
            "obj-11",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-9",
            0
          ],
          "destination": [
            "obj-2",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-10",
            0
          ],
          "destination": [
            "obj-2",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-11",
            0
          ],
          "destination": [
            "obj-2",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-12",
            0
          ],
          "destination": [
            "obj-14",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-14",
            0
          ],
          "destination": [
            "obj-2",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-15",
            0
          ],
          "destination": [
            "obj-17",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-17",
            0
          ],
          "destination": [
            "obj-2",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-18",
            0
          ],
          "destination": [
            "obj-20",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-20",
            0
          ],
          "destination": [
            "obj-2",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-21",
            0
          ],
          "destination": [
            "obj-23",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-23",
            0
          ],
          "destination": [
            "obj-2",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-24",
            0
          ],
          "destination": [
            "obj-26",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-26",
            0
          ],
          "destination": [
            "obj-2",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-27",
            0
          ],
          "destination": [
            "obj-29",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-29",
            0
          ],
          "destination": [
            "obj-2",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-30",
            0
          ],
          "destination": [
            "obj-31",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-31",
            0
          ],
          "destination": [
            "obj-32",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-32",
            0
          ],
          "destination": [
            "obj-2",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-33",
            0
          ],
          "destination": [
            "obj-34",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-34",
            0
          ],
          "destination": [
            "obj-35",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-35",
            0
          ],
          "destination": [
            "obj-2",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-36",
            0
          ],
          "destination": [
            "obj-38",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-38",
            0
          ],
          "destination": [
            "obj-39",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-39",
            0
          ],
          "destination": [
            "obj-2",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-38",
            1
          ],
          "destination": [
            "obj-40",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-40",
            0
          ],
          "destination": [
            "obj-2",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-38",
            2
          ],
          "destination": [
            "obj-41",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-41",
            0
          ],
          "destination": [
            "obj-2",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-38",
            3
          ],
          "destination": [
            "obj-42",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-42",
            0
          ],
          "destination": [
            "obj-2",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-38",
            4
          ],
          "destination": [
            "obj-43",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-43",
            0
          ],
          "destination": [
            "obj-2",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-38",
            5
          ],
          "destination": [
            "obj-44",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-44",
            0
          ],
          "destination": [
            "obj-2",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-38",
            6
          ],
          "destination": [
            "obj-45",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-45",
            0
          ],
          "destination": [
            "obj-2",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-46",
            0
          ],
          "destination": [
            "obj-48",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-48",
            0
          ],
          "destination": [
            "obj-49",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-49",
            0
          ],
          "destination": [
            "obj-2",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-48",
            1
          ],
          "destination": [
            "obj-50",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-50",
            0
          ],
          "destination": [
            "obj-2",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-48",
            2
          ],
          "destination": [
            "obj-51",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-51",
            0
          ],
          "destination": [
            "obj-2",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-48",
            3
          ],
          "destination": [
            "obj-52",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-52",
            0
          ],
          "destination": [
            "obj-2",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-48",
            4
          ],
          "destination": [
            "obj-53",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-53",
            0
          ],
          "destination": [
            "obj-2",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-48",
            5
          ],
          "destination": [
            "obj-54",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-54",
            0
          ],
          "destination": [
            "obj-2",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-48",
            6
          ],
          "destination": [
            "obj-55",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-55",
            0
          ],
          "destination": [
            "obj-2",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-48",
            7
          ],
          "destination": [
            "obj-56",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-56",
            0
          ],
          "destination": [
            "obj-2",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-48",
            8
          ],
          "destination": [
            "obj-57",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-57",
            0
          ],
          "destination": [
            "obj-2",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-48",
            9
          ],
          "destination": [
            "obj-58",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-58",
            0
          ],
          "destination": [
            "obj-2",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-48",
            10
          ],
          "destination": [
            "obj-59",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-59",
            0
          ],
          "destination": [
            "obj-2",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-48",
            11
          ],
          "destination": [
            "obj-60",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-60",
            0
          ],
          "destination": [
            "obj-2",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-61",
            0
          ],
          "destination": [
            "obj-63",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-63",
            0
          ],
          "destination": [
            "obj-64",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-64",
            0
          ],
          "destination": [
            "obj-2",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-63",
            1
          ],
          "destination": [
            "obj-65",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-65",
            0
          ],
          "destination": [
            "obj-2",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-63",
            2
          ],
          "destination": [
            "obj-66",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-66",
            0
          ],
          "destination": [
            "obj-2",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-63",
            3
          ],
          "destination": [
            "obj-67",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-67",
            0
          ],
          "destination": [
            "obj-2",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-63",
            4
          ],
          "destination": [
            "obj-68",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-68",
            0
          ],
          "destination": [
            "obj-2",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-63",
            5
          ],
          "destination": [
            "obj-69",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-69",
            0
          ],
          "destination": [
            "obj-2",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-71",
            0
          ],
          "destination": [
            "obj-72",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-72",
            0
          ],
          "destination": [
            "obj-12",
            0
          ]
        }
      }
    ]
  }
}