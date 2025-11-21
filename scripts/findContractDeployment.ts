import { ethers } from "ethers";
import * as dotenv from "dotenv";

dotenv.config();

const CONTENT_REGISTRY_ADDRESS = process.env.CONTENT_REGISTRY_ADDRESS || "0x8319877ed76390EbcC069eBf7Be1C9EC3E158E5c";
const SOMNIA_RPC_URL = process.env.SOMNIA_RPC_URL || "https://dream-rpc.somnia.network";

async function findDeploymentBlock() {
  const provider = new ethers.JsonRpcProvider(SOMNIA_RPC_URL);
  const currentBlock = await provider.getBlockNumber();
  
  console.log("🔍 Finding contract deployment block...");
  console.log(`Current block: ${currentBlock}\n`);
  
  // Binary search for deployment block
  let low = 0;
  let high = currentBlock;
  let deploymentBlock = 0;
  
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    
    try {
      const code = await provider.getCode(CONTENT_REGISTRY_ADDRESS, mid);
      
      if (code === "0x") {
        // Contract doesn't exist at this block
        low = mid + 1;
      } else {
        // Contract exists at this block
        deploymentBlock = mid;
        high = mid - 1;
      }
      
      if (low % 100000 === 0) {
        console.log(`Searching... current range: ${low} - ${high}`);
      }
    } catch (error) {
      console.error(`Error at block ${mid}:`, error);
      low = mid + 1;
    }
  }
  
  console.log(`\n✅ Contract deployed at approximately block: ${deploymentBlock}`);
  console.log(`📊 Blocks since deployment: ${currentBlock - deploymentBlock}`);
  
  // Get approximate deployment date
  try {
    const block = await provider.getBlock(deploymentBlock);
    if (block) {
      const deploymentDate = new Date(block.timestamp * 1000);
      console.log(`📅 Deployment date: ${deploymentDate.toISOString()}`);
      console.log(`⏱️  Time since deployment: ${Math.floor((Date.now() - deploymentDate.getTime()) / (1000 * 60 * 60 * 24))} days`);
    }
  } catch (error) {
    console.log("Could not fetch block details");
  }
}

findDeploymentBlock()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

