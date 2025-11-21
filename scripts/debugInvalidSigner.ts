import { ethers } from "ethers";

// From the failed transaction
const BUYER_ADDRESS = "0x5Dd40700322E19c0a99d0DD51129d8C25bd479A2";
const WRONG_SIGNER = "0x3c2c2c7eA9C5ac5F9E31427e5ce0C2f859A898C8";
const TOAST_TOKEN = "0x73e051113358CaBaAF6eC8d8C0E0FC97FC687379";
const CONTENT_REGISTRY = "0x8319877ed76390EbcC069eBf7Be1C9EC3E158E5c";
const PRICE = ethers.parseEther("999");

console.log("🔍 Debugging ERC2612InvalidSigner\n");
console.log("Expected signer (owner):", BUYER_ADDRESS);
console.log("Actual recovered signer:", WRONG_SIGNER);
console.log("\n💡 The signature was signed with different parameters than expected!\n");

// Try different variations of the domain
const variations = [
  {
    name: "Default (what we're using)",
    domain: {
      name: "TOAST Token",
      version: "1",
      chainId: 50312,
      verifyingContract: TOAST_TOKEN
    }
  },
  {
    name: "Lowercase verifyingContract",
    domain: {
      name: "TOAST Token",
      version: "1",
      chainId: 50312,
      verifyingContract: TOAST_TOKEN.toLowerCase()
    }
  },
  {
    name: "String chainId",
    domain: {
      name: "TOAST Token",
      version: "1",
      chainId: "50312",
      verifyingContract: TOAST_TOKEN
    }
  },
  {
    name: "Lowercase owner/spender",
    domain: {
      name: "TOAST Token",
      version: "1",
      chainId: 50312,
      verifyingContract: TOAST_TOKEN
    },
    messageLowercase: true
  }
];

const types = {
  Permit: [
    { name: "owner", type: "address" },
    { name: "spender", type: "address" },
    { name: "value", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" }
  ]
};

console.log("🧪 Testing domain variations:\n");

for (const variation of variations) {
  try {
    const message = {
      owner: variation.messageLowercase ? BUYER_ADDRESS.toLowerCase() : BUYER_ADDRESS,
      spender: variation.messageLowercase ? CONTENT_REGISTRY.toLowerCase() : CONTENT_REGISTRY,
      value: PRICE,
      nonce: 0n,
      deadline: 1763191772n // From the failed tx
    };
    
    const domainSeparator = ethers.TypedDataEncoder.hashDomain(variation.domain as any);
    const messageHash = ethers.TypedDataEncoder.hash(variation.domain as any, types, message);
    
    console.log(`${variation.name}:`);
    console.log(`  Domain separator: ${domainSeparator}`);
    console.log(`  Message hash: ${messageHash}`);
    console.log();
  } catch (e: any) {
    console.log(`${variation.name}: ERROR - ${e.message}\n`);
  }
}

console.log("\n💡 Key Insight:");
console.log("The wrong signer address means the user signed with DIFFERENT parameters");
console.log("than what the contract is expecting. Possible causes:");
console.log("1. User's wallet is on wrong network during signing");
console.log("2. Wallet is using a different account than the one we think");
console.log("3. Some parameter (addresses, amounts) is different between sign & verify");
console.log("\n🔧 Solution: Ensure user is on Somnia Testnet when signing!");

