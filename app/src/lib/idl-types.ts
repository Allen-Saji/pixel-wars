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
          "name": "payer",
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
          "name": "bufferPda",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  117,
                  102,
                  102,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "pda"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                67,
                47,
                206,
                133,
                145,
                249,
                117,
                201,
                235,
                5,
                244,
                246,
                20,
                178,
                182,
                219,
                132,
                238,
                57,
                224,
                20,
                244,
                77,
                30,
                98,
                217,
                106,
                254,
                152,
                54,
                145,
                45
              ]
            }
          }
        },
        {
          "name": "delegationRecordPda",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "pda"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "delegationMetadataPda",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110,
                  45,
                  109,
                  101,
                  116,
                  97,
                  100,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "pda"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "pda",
          "docs": [
            "Canvas is zero_copy and the delegation CPI changes ownership."
          ],
          "writable": true
        },
        {
          "name": "validator"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "ownerProgram",
          "address": "5XGbapaUWi6ViSxcCY3Ud7J7RbNdB4UNYtSr761jxWH2"
        },
        {
          "name": "delegationProgram",
          "address": "DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh"
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
          "name": "agent",
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
        },
        {
          "name": "teamId",
          "type": "u8"
        }
      ]
    },
    {
      "name": "processUndelegation",
      "discriminator": [
        196,
        28,
        41,
        206,
        48,
        37,
        51,
        167
      ],
      "accounts": [
        {
          "name": "baseAccount",
          "writable": true
        },
        {
          "name": "buffer"
        },
        {
          "name": "payer",
          "writable": true
        },
        {
          "name": "systemProgram"
        }
      ],
      "args": [
        {
          "name": "accountSeeds",
          "type": {
            "vec": "bytes"
          }
        }
      ]
    },
    {
      "name": "registerAgent",
      "discriminator": [
        135,
        157,
        66,
        195,
        2,
        113,
        175,
        30
      ],
      "accounts": [
        {
          "name": "agent",
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
          "name": "registration",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "agent"
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
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "teamId",
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
      "name": "agentRegistration",
      "discriminator": [
        130,
        53,
        100,
        103,
        121,
        77,
        148,
        19
      ]
    },
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
    },
    {
      "code": 12007,
      "name": "invalidTeamId",
      "msg": "Invalid team ID"
    },
    {
      "code": 12008,
      "name": "agentAlreadyRegistered",
      "msg": "Agent already registered for this round"
    }
  ],
  "types": [
    {
      "name": "agentRegistration",
      "docs": [
        "Agent registration for a round (PDA: [\"agent\", agent_pubkey, round_le_bytes])"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "agent",
            "docs": [
              "Agent wallet pubkey"
            ],
            "type": "pubkey"
          },
          {
            "name": "round",
            "docs": [
              "Round registered for"
            ],
            "type": "u32"
          },
          {
            "name": "teamId",
            "docs": [
              "Team ID (0-indexed)"
            ],
            "type": "u8"
          },
          {
            "name": "registeredAt",
            "docs": [
              "Registration timestamp"
            ],
            "type": "i64"
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
                30000
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
