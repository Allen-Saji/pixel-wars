module.exports = {
  apps: [
    {
      name: "picasso",
      script: "picasso.ts",
      cwd: __dirname,
      interpreter: "npx",
      interpreter_args: "tsx",
      env: {
        L1_RPC_URL: "https://api.devnet.solana.com",
        ER_RPC_URL: "https://devnet-rpc.magicblock.app",
      },
    },
    {
      name: "defender",
      script: "defender.ts",
      cwd: __dirname,
      interpreter: "npx",
      interpreter_args: "tsx",
      env: {
        L1_RPC_URL: "https://api.devnet.solana.com",
        ER_RPC_URL: "https://devnet-rpc.magicblock.app",
      },
    },
    {
      name: "chaos",
      script: "chaos.ts",
      cwd: __dirname,
      interpreter: "npx",
      interpreter_args: "tsx",
      env: {
        L1_RPC_URL: "https://api.devnet.solana.com",
        ER_RPC_URL: "https://devnet-rpc.magicblock.app",
      },
    },
  ],
};
