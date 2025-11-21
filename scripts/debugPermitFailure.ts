import { ethers } from "ethers";
import * as dotenv from "dotenv";

dotenv.config();

const CONTENT_REGISTRY_ADDRESS = "0x8319877ed76390EbcC069eBf7Be1C9EC3E158E5c";
const TOAST_TOKEN_ADDRESS = "0x73e051113358CaBaAF6eC8d8C0E0FC97FC687379";
const BUYER_ADDRESS = "0x5Dd40700322E19c0a99d0DD51129d8C25bd479A2";
const SOMNIA_RPC_URL = "https://dream-rpc.somnia.network";

// From the screenshot
const CONTENT_ID = 552;
const DEADLINE = 1763190783; // From screenshot
const V = 27; // Need to confirm this
const R = "0x1b32ba8ae2f43d7e3dfdece0f7d0ab66ed400b427c7adab6d8b03da255884e9";
const S = "0xe8c69736a6a0d8595d5349e2265fb4b91ab62789442125732ce6f1d31c61442d385";

const CONTENT_REGISTRY_ABI = [
  "function purchaseContentWithPermit(uint256 _contentId, uint256 _deadline, uint8 _v, bytes32 _r, bytes32 _s)"
];

const TOAST_ABI = [
  "function nonces(address) view returns (uint256)",
  "function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s)",
  "function allowance(address owner, address spender) view returns (uint256)"
];

async function main() {
  const provider = new ethers.JsonRpcProvider(SOMNIA_RPC_URL);
  const registry = new ethers.Contract(CONTENT_REGISTRY_ADDRESS, CONTENT_REGISTRY_ABI, provider);
  const toast = new ethers.Contract(TOAST_TOKEN_ADDRESS, TOAST_ABI, provider);
  
  console.log("🔍 Investigating Failed Transaction\n");
  console.log("Buyer:", BUYER_ADDRESS);
  console.log("Content ID:", CONTENT_ID);
  console.log("Deadline:", DEADLINE, "(" + new Date(DEADLINE * 1000).toISOString() + ")");
  console.log("\n📊 Permit Parameters:");
  console.log("  v:", V);
  console.log("  r:", R);
  console.log("  s:", S);
  
  // Check current state
  const nonce = await toast.nonces(BUYER_ADDRESS);
  console.log("\n📝 Current nonce:", nonce.toString());
  
  const allowance = await toast.allowance(BUYER_ADDRESS, CONTENT_REGISTRY_ADDRESS);
  console.log("📝 Current allowance:", ethers.formatEther(allowance));
  
  // Try to call the function to get revert reason
  try {
    console.log("\n🧪 Simulating transaction...");
    await registry.purchaseContentWithPermit.staticCall(
      CONTENT_ID,
      DEADLINE,
      V,
      R,
      S,
      { from: BUYER_ADDRESS }
    );
    console.log("✅ Transaction would succeed!");
  } catch (error: any) {
    console.log("\n❌ Transaction would fail:");
    console.log(error.message || error);
    
    if (error.data) {
      console.log("\n📋 Revert data:", error.data);
    }
    
    // Try to decode revert reason
    if (error.message.includes("ERC20Permit: invalid signature")) {
      console.log("\n💡 DIAGNOSIS: The permit signature is invalid!");
      console.log("   Possible causes:");
      console.log("   1. Wrong v value (should be 27 or 28 for EIP-2612)");
      console.log("   2. Signature doesn't match the expected parameters");
      console.log("   3. Wrong signer (signature not from buyer)");
    } else if (error.message.includes("ERC20Permit: expired deadline")) {
      console.log("\n💡 DIAGNOSIS: The deadline has expired!");
    } else if (error.message.includes("Content not available")) {
      console.log("\n💡 DIAGNOSIS: Content is not available for purchase!");
    } else {
      console.log("\n💡 DIAGNOSIS: Unknown error - check contract state");
    }
  }
}

main().catch(console.error);

