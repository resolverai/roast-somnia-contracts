import { ethers } from "ethers";

const CONTENT_REGISTRY_ADDRESS = "0x8319877ed76390EbcC069eBf7Be1C9EC3E158E5c";
const SOMNIA_RPC_URL = "https://dream-rpc.somnia.network";

const REGISTRY_ABI = [
  "function rewardDistribution() view returns (address)",
  "function paused() view returns (bool)",
  "function roastToken() view returns (address)",
  "function owner() view returns (address)"
];

async function main() {
  const provider = new ethers.JsonRpcProvider(SOMNIA_RPC_URL);
  const registry = new ethers.Contract(CONTENT_REGISTRY_ADDRESS, REGISTRY_ABI, provider);
  
  console.log("🔍 Checking ContentRegistry Configuration\n");
  
  const rewardDist = await registry.rewardDistribution();
  console.log("Reward Distribution:", rewardDist);
  
  const isPaused = await registry.paused();
  console.log("Is Paused:", isPaused);
  
  const roastToken = await registry.roastToken();
  console.log("ROAST/TOAST Token:", roastToken);
  
  const owner = await registry.owner();
  console.log("Owner:", owner);
  
  if (rewardDist === "0x0000000000000000000000000000000000000000") {
    console.log("\n❌ WARNING: Reward Distribution not set!");
  }
  
  if (isPaused) {
    console.log("\n❌ WARNING: Contract is PAUSED!");
  }
}

main().catch(console.error);

