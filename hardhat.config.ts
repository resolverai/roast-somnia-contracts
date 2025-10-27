import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

// Validate private key
const getValidatedPrivateKey = (): string[] => {
  const privateKey = process.env.PRIVATE_KEY;
  
  if (!privateKey || privateKey === "your_private_key_here") {
    console.warn("⚠️ No valid private key found in .env file");
    return [];
  }
  
  // Remove 0x prefix if present
  const cleanKey = privateKey.startsWith("0x") ? privateKey.slice(2) : privateKey;
  
  // Check if private key is valid length (64 hex characters = 32 bytes)
  if (cleanKey.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(cleanKey)) {
    console.warn("⚠️ Invalid private key format. Must be 64 hex characters (32 bytes)");
    return [];
  }
  
  return [`0x${cleanKey}`];
};

const validatedAccounts = getValidatedPrivateKey();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    baseMainnet: {
      url: process.env.BASE_MAINNET_RPC_URL || "https://mainnet.base.org",
      accounts: validatedAccounts,
      chainId: 8453,
    },
    baseTestnet: {
      url: process.env.BASE_TESTNET_RPC_URL || "https://sepolia.base.org",
      accounts: validatedAccounts,
      chainId: 84532,
    },
    bnbTestnet: {
      url: process.env.BNB_TESTNET_RPC_URL || "https://data-seed-prebsc-1-s1.binance.org:8545",
      accounts: validatedAccounts,
      chainId: 97,
    },
    // Somnia Testnet Configuration (Shannon)
    somniaTestnet: {
      url: process.env.SOMNIA_TESTNET_RPC_URL || "https://dream-rpc.somnia.network",
      accounts: validatedAccounts,
      chainId: 50312, // Correct Somnia testnet chain ID
      gasPrice: 6000000000, // 6 gwei (network requirement)
    },
    // Somnia Mainnet Configuration (for future use)
    somniaMainnet: {
      url: process.env.SOMNIA_MAINNET_RPC_URL || "https://rpc.somnia.network",
      accounts: validatedAccounts,
      chainId: 2648, // Somnia mainnet chain ID
      gasPrice: 1000000000, // 1 gwei
    },
  },
  etherscan: {
    apiKey: {
      baseMainnet: process.env.BASESCAN_API_KEY || "",
      baseTestnet: process.env.BASESCAN_API_KEY || "",
      bnbTestnet: process.env.BSCSCAN_API_KEY || "",
      somniaTestnet: "empty", // Shannon Explorer requires 'empty' as API key
    },
    customChains: [
      {
        network: "baseMainnet",
        chainId: 8453,
        urls: {
          apiURL: "https://api.basescan.org/api",
          browserURL: "https://basescan.org",
        },
      },
      {
        network: "baseTestnet",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org",
        },
      },
      {
        network: "bnbTestnet",
        chainId: 97,
        urls: {
          apiURL: "https://api-testnet.bscscan.com/api",
          browserURL: "https://testnet.bscscan.com",
        },
      },
      {
        network: "somniaTestnet",
        chainId: 50312,
        urls: {
          apiURL: "https://somnia.w3us.site/api",
          browserURL: "https://somnia.w3us.site",
        },
      },
    ],
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
};

export default config;