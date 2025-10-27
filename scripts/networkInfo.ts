import { ethers } from "hardhat";
import { somniaExplorer } from "./somniaExplorerAPI";

/**
 * Network Information Script
 * Get comprehensive network information for Somnia
 */

async function main() {
  console.log("🌐 Somnia Network Information");
  console.log("=" .repeat(50));

  try {
    // Get network information
    const network = await ethers.provider.getNetwork();
    console.log("📡 Network Details:");
    console.log("   Name:", network.name);
    console.log("   Chain ID:", network.chainId.toString());
    
    // Get latest block
    const latestBlock = await ethers.provider.getBlockNumber();
    console.log("   Latest Block:", latestBlock.toLocaleString());
    
    // Get gas price
    const gasPrice = await ethers.provider.getFeeData();
    console.log("   Gas Price:", ethers.formatUnits(gasPrice.gasPrice || 0n, "gwei"), "gwei");
    console.log("   Max Fee Per Gas:", ethers.formatUnits(gasPrice.maxFeePerGas || 0n, "gwei"), "gwei");
    console.log("   Max Priority Fee:", ethers.formatUnits(gasPrice.maxPriorityFeePerGas || 0n, "gwei"), "gwei");

    // Get deployer account info
    const [deployer] = await ethers.getSigners();
    const balance = await ethers.provider.getBalance(deployer.address);
    
    console.log("\n👤 Account Information:");
    console.log("   Address:", deployer.address);
    console.log("   Balance:", ethers.formatEther(balance), "ETH");
    console.log("   Nonce:", await ethers.provider.getTransactionCount(deployer.address));

    // Get explorer information if available
    console.log("\n🔍 Explorer Information:");
    try {
      const networkSummary = await somniaExplorer.getNetworkSummary();
      if (networkSummary.stats) {
        console.log("   Network Stats: ✅ Available");
        console.log("   Total Transactions:", networkSummary.stats.total_transactions || "Unknown");
        console.log("   Total Blocks:", networkSummary.stats.total_blocks || "Unknown");
        if (networkSummary.stats.network_utilization_percentage) {
          console.log("   Network Utilization:", `${networkSummary.stats.network_utilization_percentage}%`);
        }
      }

      // Try to get deployer address info
      const deployerInfo = await somniaExplorer.getAddressInfo(deployer.address);
      if (deployerInfo && deployerInfo.coin_balance) {
        console.log("   Explorer Balance:", ethers.formatEther(deployerInfo.coin_balance), "ETH");
        console.log("   Balance Match:", deployerInfo.coin_balance === balance.toString() ? "✅ Match" : "⚠️ Different");
      }
    } catch (error) {
      console.log("   ⚠️ Explorer API not available");
    }

    // Network performance test
    console.log("\n⚡ Network Performance Test:");
    const startTime = Date.now();
    
    try {
      await ethers.provider.getBlockNumber();
      const responseTime = Date.now() - startTime;
      console.log("   RPC Response Time:", `${responseTime}ms`);
      
      if (responseTime < 100) {
        console.log("   Performance:", "🚀 Excellent");
      } else if (responseTime < 500) {
        console.log("   Performance:", "✅ Good");
      } else if (responseTime < 1000) {
        console.log("   Performance:", "⚠️ Slow");
      } else {
        console.log("   Performance:", "❌ Very Slow");
      }
    } catch (error) {
      console.log("   Performance:", "❌ Connection Failed");
    }

    // Contract deployment estimate
    console.log("\n💰 Deployment Cost Estimate:");
    const estimatedGas = 2500000n; // Approximate gas for TOAST token deployment
    const deploymentCost = (gasPrice.gasPrice || 0n) * estimatedGas;
    
    console.log("   Estimated Gas:", estimatedGas.toLocaleString());
    console.log("   Deployment Cost:", ethers.formatEther(deploymentCost), "ETH");
    console.log("   Can Deploy:", balance > deploymentCost ? "✅ Yes" : "❌ Insufficient funds");

    // Useful links
    console.log("\n🔗 Useful Links:");
    console.log("   Somnia Explorer:", "https://somnia.w3us.site");
    console.log("   Account Explorer:", `https://somnia.w3us.site/address/${deployer.address}`);
    console.log("   RPC Endpoint:", network.name === "somniaTestnet" ? "https://dream-rpc.somnia.network" : "https://rpc.somnia.network");

  } catch (error) {
    console.error("❌ Error getting network information:", error);
  }

  console.log("\n" + "=".repeat(50));
}

// Execute network info
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Network info failed:", error);
    process.exit(1);
  });
