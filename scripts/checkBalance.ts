import { ethers } from "hardhat";
import { somniaExplorer } from "./somniaExplorerAPI";

/**
 * Balance Checker Script
 * Check balances for multiple addresses and tokens
 */

async function main() {
  console.log("💰 Balance Checker");
  console.log("=" .repeat(40));

  // Get signers
  const signers = await ethers.getSigners();
  const [deployer] = signers;

  console.log("📊 ETH Balances:");
  
  // Check ETH balances for all signers
  for (let i = 0; i < Math.min(signers.length, 5); i++) {
    const signer = signers[i];
    const balance = await ethers.provider.getBalance(signer.address);
    const label = i === 0 ? "Deployer" : `Account ${i}`;
    
    console.log(`   ${label}: ${ethers.formatEther(balance)} ETH`);
    console.log(`     Address: ${signer.address}`);
    
    // Get explorer balance for comparison
    try {
      const explorerBalance = await somniaExplorer.getAccountBalance(signer.address);
      if (explorerBalance.result) {
        const match = explorerBalance.result === balance.toString();
        console.log(`     Explorer: ${ethers.formatEther(explorerBalance.result)} ETH ${match ? "✅" : "⚠️"}`);
      }
    } catch (error) {
      console.log(`     Explorer: ⚠️ Not available`);
    }
    
    console.log();
  }

  // Check TOAST token balances if contract is deployed
  const toastTokenAddress = process.env.TOAST_TOKEN_ADDRESS;
  
  if (toastTokenAddress) {
    console.log("🍞 TOAST Token Balances:");
    console.log(`   Contract: ${toastTokenAddress}`);
    
    try {
      const toastToken = await ethers.getContractAt("TOASTToken", toastTokenAddress);
      const totalSupply = await toastToken.totalSupply();
      
      console.log(`   Total Supply: ${ethers.formatEther(totalSupply)} TOAST`);
      console.log();
      
      for (let i = 0; i < Math.min(signers.length, 5); i++) {
        const signer = signers[i];
        const balance = await toastToken.balanceOf(signer.address);
        const stakedBalance = await toastToken.stakedBalances(signer.address);
        const label = i === 0 ? "Deployer" : `Account ${i}`;
        
        console.log(`   ${label}:`);
        console.log(`     Liquid: ${ethers.formatEther(balance)} TOAST`);
        console.log(`     Staked: ${ethers.formatEther(stakedBalance)} TOAST`);
        console.log(`     Total: ${ethers.formatEther(balance + stakedBalance)} TOAST`);
        
        // Get explorer token balance
        try {
          const explorerBalance = await somniaExplorer.getAccountTOASTBalance(toastTokenAddress, signer.address);
          console.log(`     Explorer: ${explorerBalance.balance} TOAST`);
        } catch (error) {
          console.log(`     Explorer: ⚠️ Not indexed yet`);
        }
        
        console.log();
      }
      
      // Contract balance
      const contractBalance = await toastToken.balanceOf(toastTokenAddress);
      console.log(`   Contract Balance: ${ethers.formatEther(contractBalance)} TOAST`);
      
    } catch (error) {
      console.log("   ❌ Could not connect to TOAST token contract");
      console.log("   Make sure the contract is deployed and address is correct");
    }
  } else {
    console.log("🍞 TOAST Token: Not deployed yet");
    console.log("   Set TOAST_TOKEN_ADDRESS in .env after deployment");
  }

  // Check for other environment variables
  console.log("\n🔧 Environment Check:");
  console.log(`   Private Key: ${process.env.PRIVATE_KEY ? "✅ Set" : "❌ Missing"}`);
  console.log(`   Somnia RPC: ${process.env.SOMNIA_TESTNET_RPC_URL ? "✅ Set" : "❌ Missing"}`);
  console.log(`   Somnia API Key: ${process.env.SOMNIA_API_KEY ? "✅ Set" : "⚠️ Optional"}`);
  console.log(`   TOAST Address: ${process.env.TOAST_TOKEN_ADDRESS ? "✅ Set" : "⚠️ Not deployed"}`);

  // Network summary
  const network = await ethers.provider.getNetwork();
  console.log("\n🌐 Network Summary:");
  console.log(`   Network: ${network.name} (Chain ID: ${network.chainId})`);
  console.log(`   Block: ${await ethers.provider.getBlockNumber()}`);
  
  const gasPrice = await ethers.provider.getFeeData();
  console.log(`   Gas Price: ${ethers.formatUnits(gasPrice.gasPrice || 0n, "gwei")} gwei`);

  // Quick deployment readiness check
  const deployerBalance = await ethers.provider.getBalance(deployer.address);
  const minRequiredBalance = ethers.parseEther("0.01"); // 0.01 ETH minimum
  
  console.log("\n🚀 Deployment Readiness:");
  console.log(`   Deployer Balance: ${ethers.formatEther(deployerBalance)} ETH`);
  console.log(`   Minimum Required: ${ethers.formatEther(minRequiredBalance)} ETH`);
  console.log(`   Ready to Deploy: ${deployerBalance > minRequiredBalance ? "✅ Yes" : "❌ Need more ETH"}`);

  console.log("\n" + "=".repeat(40));
}

// Execute balance check
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Balance check failed:", error);
    process.exit(1);
  });
