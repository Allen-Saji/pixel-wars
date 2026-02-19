/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/pixel_wars.json`.
 */
export type PixelWars = {
  "address": "5XGbapaUWi6ViSxcCY3Ud7J7RbNdB4UNYtSr761jxWH2",
  "metadata": {
    "name": "pixelWars",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "delegateCanvas",
      "discriminator": [
        202,
        133,
        206,
        184,
        226,
        235,
        15,
        185
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "gameConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "canvas",
          "docs": [
            "delegation CPI changes the owner mid-instruction."
          ],
          "writable": true
        },
        {
          "name": "ownerProgram",
          "address": "5XGbapaUWi6ViSxcCY3Ud7J7RbNdB4UNYtSr761jxWH2"
        },
        {
          "name": "buffer",
          "writable": true
        },
        {
          "name": "delegationRecord",
          "writable": true
        },
        {
          "name": "delegationMetadata",
          "writable": true
        },
        {
          "name": "delegationProgram"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "endRound",
      "discriminator": [
        54,
        47,
        1,
        200,
        250,
        6,
        144,
        63
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "gameConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "canvas",
          "writable": true
        },
        {
          "name": "round",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  111,
                  117,
                  110,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "game_config.current_round",
                "account": "gameConfig"
              }
            ]
          }
        },
        {
          "name": "magicContext",
          "writable": true
        },
        {
          "name": "magicProgram"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "initialize",
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "gameConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "placePixel",
      "discriminator": [
        178,
        40,
        167,
        97,
        31,
        149,
        219,
        143
      ],
      "accounts": [
        {
          "name": "player",
          "writable": true,
          "signer": true
        },
        {
          "name": "gameConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "canvas",
          "docs": [
            "The canvas — uses zero_copy AccountLoader.",
            "Lives inside ER during active round."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  97,
                  110,
                  118,
                  97,
                  115
                ]
              },
              {
                "kind": "account",
                "path": "game_config.current_round",
                "account": "gameConfig"
              }
            ]
          }
        },
        {
          "name": "playerStats",
          "docs": [
            "Player stats — init if first placement this round."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  121,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "game_config.current_round",
                "account": "gameConfig"
              },
              {
                "kind": "account",
                "path": "player"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "x",
          "type": "u16"
        },
        {
          "name": "y",
          "type": "u16"
        },
        {
          "name": "r",
          "type": "u8"
        },
        {
          "name": "g",
          "type": "u8"
        },
        {
          "name": "b",
          "type": "u8"
        }
      ]
    },
    {
      "name": "startRound",
      "discriminator": [
        144,
        144,
        43,
        7,
        193,
        42,
        217,
        215
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "gameConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "canvas",
          "docs": [
            "Canvas uses zero_copy — init with `zero` constraint"
          ],
          "writable": true
        },
        {
          "name": "round",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "canvas",
      "discriminator": [
        239,
        248,
        162,
        140,
        114,
        179,
        55,
        66
      ]
    },
    {
      "name": "gameConfig",
      "discriminator": [
        45,
        146,
        146,
        33,
        170,
        69,
        96,
        133
      ]
    },
    {
      "name": "playerStats",
      "discriminator": [
        169,
        146,
        242,
        176,
        102,
        118,
        231,
        172
      ]
    },
    {
      "name": "round",
      "discriminator": [
        87,
        127,
        165,
        51,
        73,
        78,
        116,
        174
      ]
    }
  ],
  "errors": [
    {
      "code": 12000,
      "name": "unauthorized",
      "msg": "Unauthorized — only authority can perform this action"
    },
    {
      "code": 12001,
      "name": "noActiveRound",
      "msg": "No active round"
    },
    {
      "code": 12002,
      "name": "roundAlreadyActive",
      "msg": "Round is already active"
    },
    {
      "code": 12003,
      "name": "outOfBounds",
      "msg": "Pixel coordinates out of bounds (max 99x99)"
    },
    {
      "code": 12004,
      "name": "cooldownNotElapsed",
      "msg": "Placement cooldown not elapsed — wait a few seconds"
    },
    {
      "code": 12005,
      "name": "roundEnded",
      "msg": "Round has already ended"
    },
    {
      "code": 12006,
      "name": "arithmeticOverflow",
      "msg": "Arithmetic overflow"
    }
  ],
  "types": [
    {
      "name": "canvas",
      "docs": [
        "The pixel canvas — delegated to ER during active rounds.",
        "Uses zero_copy to avoid BPF stack overflow (7.5KB+ data)."
      ],
      "serialization": "bytemuckunsafe",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "totalPlacements",
            "docs": [
              "Total pixels placed this round"
            ],
            "type": "u64"
          },
          {
            "name": "round",
            "docs": [
              "Which round this canvas belongs to"
            ],
            "type": "u32"
          },
          {
            "name": "bump",
            "docs": [
              "Bump seed"
            ],
            "type": "u8"
          },
          {
            "name": "padding",
            "docs": [
              "Padding for alignment"
            ],
            "type": {
              "array": [
                "u8",
                3
              ]
            }
          },
          {
            "name": "pixels",
            "docs": [
              "Raw pixel data: [r0, g0, b0, r1, g1, b1, ...] row-major"
            ],
            "type": {
              "array": [
                "u8",
                7500
              ]
            }
          }
        ]
      }
    },
    {
      "name": "gameConfig",
      "docs": [
        "Game configuration (singleton)"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "docs": [
              "Admin authority"
            ],
            "type": "pubkey"
          },
          {
            "name": "currentRound",
            "docs": [
              "Current round number (0 = no active round)"
            ],
            "type": "u32"
          },
          {
            "name": "roundActive",
            "docs": [
              "Whether a round is currently active"
            ],
            "type": "bool"
          },
          {
            "name": "bump",
            "docs": [
              "Bump seed"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "playerStats",
      "docs": [
        "Per-player stats for a round"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "player",
            "docs": [
              "Player pubkey"
            ],
            "type": "pubkey"
          },
          {
            "name": "round",
            "docs": [
              "Round number"
            ],
            "type": "u32"
          },
          {
            "name": "pixelsPlaced",
            "docs": [
              "Total pixels placed"
            ],
            "type": "u32"
          },
          {
            "name": "lastPlacementSlot",
            "docs": [
              "Last placement slot (for rate limiting)"
            ],
            "type": "u64"
          },
          {
            "name": "bump",
            "docs": [
              "Bump seed"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "round",
      "docs": [
        "Round metadata"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "roundNumber",
            "docs": [
              "Round number"
            ],
            "type": "u32"
          },
          {
            "name": "startSlot",
            "docs": [
              "Start slot"
            ],
            "type": "u64"
          },
          {
            "name": "endSlot",
            "docs": [
              "End slot (0 if still active)"
            ],
            "type": "u64"
          },
          {
            "name": "totalPlacements",
            "docs": [
              "Total pixels placed"
            ],
            "type": "u64"
          },
          {
            "name": "ended",
            "docs": [
              "Whether the round has ended"
            ],
            "type": "bool"
          },
          {
            "name": "bump",
            "docs": [
              "Bump seed"
            ],
            "type": "u8"
          }
        ]
      }
    }
  ]
};
