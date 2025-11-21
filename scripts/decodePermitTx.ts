import { ethers } from "ethers";

// From the error screenshot
const txData = "0x23c30991000000000000000000000000000000000000000000000000000000000000022800000000000000000000000000000000000000000000000069182a130000000000000000000000000000000000000000000000000000000000000000000000000000000001b32ba8ae2f43d7e3dfdece0f7d0ab66ed400b427c7adab6d8b03da255884e9e8c69736a6a0d8595d5349e2265fb4b91ab62789442125732ce6f1d31c61442d385";

const abi = [
  "function purchaseContentWithPermit(uint256 _contentId, uint256 _deadline, uint8 _v, bytes32 _r, bytes32 _s)"
];

const iface = new ethers.Interface(abi);
const decoded = iface.parseTransaction({ data: txData });

console.log("🔍 Decoded Transaction Data:\n");
console.log("Function:", decoded?.name);
console.log("\nParameters:");
console.log("  contentId:", decoded?.args[0].toString());
console.log("  deadline:", decoded?.args[1].toString());
console.log("  v:", decoded?.args[2].toString());
console.log("  r:", decoded?.args[3]);
console.log("  s:", decoded?.args[4]);

// Check if v value looks correct
const v = Number(decoded?.args[2]);
console.log("\n📊 V Value Analysis:");
console.log("  v =", v);
console.log("  Expected for EIP-155:", "27 or 28 (legacy) OR chainId * 2 + 35 + {0,1}");
console.log("  For Somnia (chainId=50312):", "50312 * 2 + 35 + {0,1} =", 50312 * 2 + 35, "or", 50312 * 2 + 36);

if (v === 27 || v === 28) {
  console.log("  ✅ Using legacy v value (27/28) - should work with EIP-2612");
} else if (v === 50312 * 2 + 35 || v === 50312 * 2 + 36) {
  console.log("  ⚠️ Using EIP-155 v value - might not work with permit!");
} else {
  console.log("  ❌ Unexpected v value!");
}

