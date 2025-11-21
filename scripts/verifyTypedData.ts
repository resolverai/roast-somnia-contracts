import { ethers } from "ethers";

const TOAST_TOKEN_ADDRESS = "0x73e051113358CaBaAF6eC8d8C0E0FC97FC687379";
const CONTENT_REGISTRY_ADDRESS = "0x8319877ed76390EbcC069eBf7Be1C9EC3E158E5c";
const BUYER_ADDRESS = "0x5Dd40700322E19c0a99d0DD51129d8C25bd479A2";
const PRICE = ethers.parseEther("999");
const SOMNIA_CHAIN_ID = 50312;

// Reconstruct the expected typed data
const domain = {
  name: "TOAST Token",
  version: "1",
  chainId: SOMNIA_CHAIN_ID,
  verifyingContract: TOAST_TOKEN_ADDRESS
};

const types = {
  Permit: [
    { name: "owner", type: "address" },
    { name: "spender", type: "address" },
    { name: "value", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" }
  ]
};

const message = {
  owner: BUYER_ADDRESS,
  spender: CONTENT_REGISTRY_ADDRESS,
  value: PRICE,
  nonce: 0,
  deadline: Math.floor(Date.now() / 1000) + 1200
};

console.log("🔍 Expected EIP-712 Typed Data\n");
console.log("Domain:");
console.log(JSON.stringify(domain, null, 2));
console.log("\nMessage:");
console.log(JSON.stringify({
  ...message,
  value: message.value.toString(),
  nonce: message.nonce.toString(),
  deadline: message.deadline.toString()
}, null, 2));

// Calculate domain separator
const domainSeparator = ethers.TypedDataEncoder.hashDomain(domain);
console.log("\n📊 Domain Separator:", domainSeparator);

// Calculate message hash
const messageHash = ethers.TypedDataEncoder.hash(domain, types, message);
console.log("📊 Message Hash:", messageHash);

console.log("\n📝 For eth_signTypedData_v4, the domain should be:");
console.log(JSON.stringify({
  name: domain.name,
  version: domain.version,
  chainId: domain.chainId, // Keep as number for eth_signTypedData_v4
  verifyingContract: domain.verifyingContract
}, null, 2));

console.log("\n💡 Key Points:");
console.log("1. chainId must be", SOMNIA_CHAIN_ID, "(as number, not string)");
console.log("2. verifyingContract must be checksummed:", ethers.getAddress(TOAST_TOKEN_ADDRESS));
console.log("3. value/nonce/deadline should be strings in the JSON for eth_signTypedData_v4");

