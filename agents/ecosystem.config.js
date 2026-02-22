module.exports = {
  apps: [
    {
      name: "magicblock-agent",
      script: "magicblock-agent.ts",
      cwd: __dirname,
      interpreter: "npx",
      interpreter_args: "tsx",
      env: {
        L1_RPC_URL: "https://api.devnet.solana.com",
        ER_RPC_URL: "https://devnet-us.magicblock.app",
        NODE_OPTIONS: "--dns-result-order=ipv4first",
      },
    },
    {
      name: "arcium-agent",
      script: "arcium-agent.ts",
      cwd: __dirname,
      interpreter: "npx",
      interpreter_args: "tsx",
      env: {
        L1_RPC_URL: "https://api.devnet.solana.com",
        ER_RPC_URL: "https://devnet-us.magicblock.app",
        NODE_OPTIONS: "--dns-result-order=ipv4first",
      },
    },
    {
      name: "jito-agent",
      script: "jito-agent.ts",
      cwd: __dirname,
      interpreter: "npx",
      interpreter_args: "tsx",
      env: {
        L1_RPC_URL: "https://api.devnet.solana.com",
        ER_RPC_URL: "https://devnet-us.magicblock.app",
        NODE_OPTIONS: "--dns-result-order=ipv4first",
      },
    },
  ],
};
