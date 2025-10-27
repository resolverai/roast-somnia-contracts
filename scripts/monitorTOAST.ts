import { ethers } from "hardhat";
import { somniaExplorer } from "./somniaExplorerAPI";

/**
 * Somnia Contract Monitor
 * Monitor and query TOAST token contract on Somnia Shannon Explorer
 */

async function main() {
  const contractAddress = process.env.TOAST_TOKEN_ADDRESS;

  if (!contractAddress) {
    console.error("❌ TOAST_TOKEN_ADDRESS not set in .env");
    console.log("💡 Deploy the contract first or add the address to your .env file");
    process.exit(1);
  }

  console.log("🔍 Monitoring TOAST Token on Somnia Explorer");
  console.log("📍 Contract Address:", contractAddress);
  console.log("🌐 Explorer URL:", `https://somnia.w3us.site/address/${contractAddress}`);
  console.log("=" .repeat(80));

  try {
    // Get comprehensive token information
    console.log("\n📊 Token Information:");
    const tokenInfo = await somniaExplorer.getTOASTTokenInfo(contractAddress);
    
    console.log("   Contract Address:", tokenInfo.contractAddress);
    console.log("   Explorer URL:", tokenInfo.explorerURL);
    
    if (tokenInfo.totalSupply?.result) {
      console.log("   Total Supply:", ethers.formatEther(tokenInfo.totalSupply.result), "TOAST");
    } else {
      console.log("   Total Supply: ⏳ Indexing...");
    }
    
    if (tokenInfo.sourceCode?.result?.[0]?.SourceCode) {
      console.log("   Source Code: ✅ Verified");
      console.log("   Contract Name:", tokenInfo.sourceCode.result[0].ContractName || "TOASTToken");
      console.log("   Compiler Version:", tokenInfo.sourceCode.result[0].CompilerVersion || "Unknown");
    } else {
      console.log("   Source Code: ⏳ Not verified yet");
    }

    // Get network stats
    console.log("\n🌐 Network Information:");
    try {
      const latestBlock = await somniaExplorer.getLatestBlockNumber();
      if (latestBlock.result) {
        const blockNumber = parseInt(latestBlock.result, 16);
        console.log("   Latest Block:", blockNumber.toLocaleString());
      }

      const etherPrice = await somniaExplorer.getEtherPrice();
      if (etherPrice.result) {
        console.log("   ETH Price:", `$${etherPrice.result.ethusd}`);
      }
    } catch (error) {
      console.log("   Network stats: ⚠️ API unavailable");
    }

    // Get top token holders (if available)
    console.log("\n👥 Token Holders:");
    try {
      const holders = await somniaExplorer.getTOASTTokenHolders(contractAddress, 10);
      if (holders?.result && holders.result.length > 0) {
        console.log("   Top holders found:", holders.result.length);
        holders.result.slice(0, 5).forEach((holder: any, index: number) => {
          console.log(`   ${index + 1}. ${holder.TokenHolderAddress}: ${ethers.formatEther(holder.TokenHolderQuantity)} TOAST`);
        });
      } else {
        console.log("   ⏳ Holder data not yet available");
      }
    } catch (error) {
      console.log("   ⏳ Holder endpoint not available");
    }

    // Check recent transactions
    console.log("\n📈 Recent Activity:");
    try {
      // Get the deployer/owner address
      const [deployer] = await ethers.getSigners();
      
      const recentTxs = await somniaExplorer.getAccountTransactions(
        contractAddress,
        0,
        99999999,
        1,
        5,
        "desc"
      );

      if (recentTxs.result && recentTxs.result.length > 0) {
        console.log("   Recent contract transactions:");
        recentTxs.result.slice(0, 3).forEach((tx: any, index: number) => {
          const date = new Date(parseInt(tx.timeStamp) * 1000);
          console.log(`   ${index + 1}. ${tx.hash.substring(0, 10)}... - ${date.toLocaleString()}`);
          console.log(`      Value: ${ethers.formatEther(tx.value)} ETH`);
          console.log(`      Gas Used: ${parseInt(tx.gasUsed).toLocaleString()}`);
          console.log(`      Status: ${tx.txreceipt_status === "1" ? "✅ Success" : "❌ Failed"}`);
        });
      } else {
        console.log("   ⏳ No transactions found yet");
      }
    } catch (error) {
      console.log("   ⚠️ Transaction data not available");
    }

    // Monitor specific addresses if provided
    const addressesToMonitor = [
      process.env.MONITOR_ADDRESS_1,
      process.env.MONITOR_ADDRESS_2,
      process.env.MONITOR_ADDRESS_3,
    ].filter(Boolean);

    if (addressesToMonitor.length > 0) {
      console.log("\n👀 Monitored Addresses:");
      for (const address of addressesToMonitor) {
        try {
          const balance = await somniaExplorer.getAccountTOASTBalance(contractAddress, address!);
          console.log(`   ${address}: ${balance.balance} TOAST`);
          
          const txs = await somniaExplorer.getAccountTOASTTransactions(contractAddress, address!, 1, 3);
          if (txs.result && txs.result.length > 0) {
            console.log(`     Recent transactions: ${txs.result.length}`);
          }
        } catch (error) {
          console.log(`   ${address}: ⚠️ Data not available`);
        }
      }
    }

    // Contract interaction statistics
    console.log("\n📊 Contract Statistics:");
    try {
      const toastToken = await ethers.getContractAt("TOASTToken", contractAddress);
      
      // Get on-chain data
      const totalSupply = await toastToken.totalSupply();
      const name = await toastToken.name();
      const symbol = await toastToken.symbol();
      const decimals = await toastToken.decimals();
      
      console.log("   Name:", name);
      console.log("   Symbol:", symbol);
      console.log("   Decimals:", decimals);
      console.log("   Total Supply:", ethers.formatEther(totalSupply), "TOAST");
      
      // Check if contract is paused
      try {
        const isPaused = await toastToken.paused();
        console.log("   Contract Status:", isPaused ? "⏸️ Paused" : "▶️ Active");
      } catch (error) {
        console.log("   Contract Status: ✅ Active (no pause function)");
      }
      
    } catch (error) {
      console.log("   ⚠️ Unable to connect to contract");
    }

  } catch (error) {
    console.error("❌ Error monitoring contract:", error);
  }

  console.log("\n" + "=".repeat(80));
  console.log("🔄 Monitoring completed. Run this script periodically to track changes.");
  console.log("🌐 View contract on explorer:", `https://somnia.w3us.site/address/${contractAddress}`);
}

// Execute monitoring
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Monitoring failed:", error);
    process.exit(1);
  });
