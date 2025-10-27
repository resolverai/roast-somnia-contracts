import { ethers } from "hardhat";
import { TOASTToken } from "../typechain-types";
import { shannonExplorer } from "./somniaExplorerAPI";

// Replace with your deployed contract address
const TOAST_TOKEN_ADDRESS = process.env.TOAST_TOKEN_ADDRESS || "";

async function main() {
  if (!TOAST_TOKEN_ADDRESS) {
    throw new Error("❌ Please set TOAST_TOKEN_ADDRESS environment variable");
  }
  
  console.log("🔍 Interacting with TOAST Token at:", TOAST_TOKEN_ADDRESS);
  
  // Get signers
  const signers = await ethers.getSigners();
  const owner = signers[0];
  
  if (!owner) {
    throw new Error("❌ No owner account found. Please check your private key configuration.");
  }
  
  console.log("👤 Owner address:", owner.address);
  
  // For testnet, we'll use the same account for demonstrations
  const user1 = owner; // Using owner as user1 for testnet demo
  const user2 = owner; // Using owner as user2 for testnet demo
  
  console.log("👤 User1 address:", user1.address, "(same as owner for testnet demo)");
  console.log("👤 User2 address:", user2.address, "(same as owner for testnet demo)");
  
  // Connect to the deployed contract
  const toastToken = await ethers.getContractAt("TOASTToken", TOAST_TOKEN_ADDRESS) as TOASTToken;
  
  console.log("\n📊 Current Token State:");
  await displayTokenInfo(toastToken, owner.address);
  
  // Query Shannon Explorer for initial contract info
  console.log("\n🔍 Shannon Explorer Data:");
  try {
    const tokenInfo = await shannonExplorer.getTOASTTokenInfo(TOAST_TOKEN_ADDRESS);
    console.log("   Explorer URL:", tokenInfo.explorerURL);
    
    if (tokenInfo.tokenInfo) {
      console.log("   Token Info: ✅ Found");
    } else {
      console.log("   Token Info: ⏳ Indexing...");
    }
    
    // Get owner balance from explorer
    try {
      const explorerOwnerBalance = await shannonExplorer.getAccountTOASTBalance(TOAST_TOKEN_ADDRESS, owner.address);
      console.log("   Owner Balance (Explorer):", explorerOwnerBalance.balance, "TOAST");
    } catch (error) {
      console.log("   Owner Balance (Explorer): ⏳ Not yet indexed");
    }
    
  } catch (error) {
    console.log("   ⚠️ Explorer data not yet indexed or API unavailable");
  }
  
  // Example interactions
  console.log("\n🔄 Performing token interactions...");
  
  // 1. Transfer tokens to users
  console.log("\n1️⃣ Transferring tokens to users...");
  const transferAmount = ethers.parseEther("1000000"); // 1M tokens
  
  const tx1 = await toastToken.connect(owner).transfer(user1.address, transferAmount);
  await tx1.wait();
  console.log("✅ Transferred", ethers.formatEther(transferAmount), "TOAST to user1");
  console.log("🔗 Transaction:", `https://somnia.w3us.site/tx/${tx1.hash}`);
  
  const tx2 = await toastToken.connect(owner).transfer(user2.address, transferAmount);
  await tx2.wait();
  console.log("✅ Transferred", ethers.formatEther(transferAmount), "TOAST to user2");
  console.log("🔗 Transaction:", `https://somnia.w3us.site/tx/${tx2.hash}`);
  
  // 2. Stake tokens
  console.log("\n2️⃣ Staking tokens...");
  const stakeAmount = ethers.parseEther("500000"); // 500K tokens
  
  const stakeTx = await toastToken.connect(user1).stake(stakeAmount);
  await stakeTx.wait();
  console.log("✅ User1 staked", ethers.formatEther(stakeAmount), "TOAST");
  
  // 3. Check staking info
  console.log("\n3️⃣ Checking staking info...");
  const stakingInfo = await toastToken.getStakingInfo(user1.address);
  console.log("📈 User1 staking info:");
  console.log("   Staked:", ethers.formatEther(stakingInfo.staked), "TOAST");
  console.log("   Timestamp:", new Date(Number(stakingInfo.timestamp) * 1000).toLocaleString());
  console.log("   Pending Rewards:", ethers.formatEther(stakingInfo.pendingRewards), "TOAST");
  
  // 4. Distribute game rewards
  console.log("\n4️⃣ Distributing game rewards...");
  const gameRewardAmount = ethers.parseEther("10000"); // 10K tokens
  
  const rewardTx = await toastToken.connect(owner).distributeGameReward(
    user2.address,
    gameRewardAmount,
    "Campaign completion reward"
  );
  await rewardTx.wait();
  console.log("✅ Distributed", ethers.formatEther(gameRewardAmount), "TOAST as game reward to user2");
  
  // 5. Check balances after operations
  console.log("\n5️⃣ Final balances:");
  const ownerBalance = await toastToken.balanceOf(owner.address);
  const user1Balance = await toastToken.balanceOf(user1.address);
  const user2Balance = await toastToken.balanceOf(user2.address);
  const contractBalance = await toastToken.balanceOf(TOAST_TOKEN_ADDRESS);
  
  console.log("👤 Owner balance:", ethers.formatEther(ownerBalance), "TOAST");
  console.log("👤 User1 balance:", ethers.formatEther(user1Balance), "TOAST");
  console.log("👤 User2 balance:", ethers.formatEther(user2Balance), "TOAST");
  console.log("📄 Contract balance:", ethers.formatEther(contractBalance), "TOAST");
  
  // 6. Test allowance and transferFrom
  console.log("\n6️⃣ Testing allowances...");
  const allowanceAmount = ethers.parseEther("50000"); // 50K tokens
  
  const approveTx = await toastToken.connect(user1).approve(user2.address, allowanceAmount);
  await approveTx.wait();
  console.log("✅ User1 approved", ethers.formatEther(allowanceAmount), "TOAST for user2");
  
  const allowance = await toastToken.allowance(user1.address, user2.address);
  console.log("📋 Current allowance:", ethers.formatEther(allowance), "TOAST");
  
  // Transfer using allowance
  const transferFromAmount = ethers.parseEther("25000"); // 25K tokens
  const transferFromTx = await toastToken.connect(user2).transferFrom(
    user1.address,
    user2.address,
    transferFromAmount
  );
  await transferFromTx.wait();
  console.log("✅ User2 transferred", ethers.formatEther(transferFromAmount), "TOAST from user1");
  
  console.log("\n🎉 All interactions completed successfully!");
  
  // Final summary with explorer links
  console.log("\n🔍 Monitor all transactions on Somnia Shannon Explorer:");
  console.log(`   Contract: https://somnia.w3us.site/address/${TOAST_TOKEN_ADDRESS}`);
  console.log(`   Owner: https://somnia.w3us.site/address/${owner.address}`);
  console.log(`   User1: https://somnia.w3us.site/address/${user1.address}`);
  console.log(`   User2: https://somnia.w3us.site/address/${user2.address}`);
  
  // Try to get recent token transactions from explorer
  try {
    console.log("\n📊 Recent Token Transactions (from Explorer):");
    const user1Txs = await shannonExplorer.getAccountTOASTTransactions(TOAST_TOKEN_ADDRESS, user1.address, 1, 3);
    const user2Txs = await shannonExplorer.getAccountTOASTTransactions(TOAST_TOKEN_ADDRESS, user2.address, 1, 3);
    
    if (user1Txs.result && user1Txs.result.length > 0) {
      console.log("   User1 recent transactions:");
      user1Txs.result.slice(0, 3).forEach((tx: any, index: number) => {
        console.log(`     ${index + 1}. ${ethers.formatEther(tx.value)} TOAST - ${tx.hash.substring(0, 10)}...`);
      });
    }
    
    if (user2Txs.result && user2Txs.result.length > 0) {
      console.log("   User2 recent transactions:");
      user2Txs.result.slice(0, 3).forEach((tx: any, index: number) => {
        console.log(`     ${index + 1}. ${ethers.formatEther(tx.value)} TOAST - ${tx.hash.substring(0, 10)}...`);
      });
    }
  } catch (error) {
    console.log("   ⚠️ Transaction history not yet indexed on explorer");
  }
}

async function displayTokenInfo(token: TOASTToken, ownerAddress: string) {
  const name = await token.name();
  const symbol = await token.symbol();
  const decimals = await token.decimals();
  const totalSupply = await token.totalSupply();
  const ownerBalance = await token.balanceOf(ownerAddress);
  const version = await token.version();
  
  console.log("📄 Contract Info:");
  console.log("   Name:", name);
  console.log("   Symbol:", symbol);
  console.log("   Decimals:", decimals);
  console.log("   Total Supply:", ethers.formatEther(totalSupply), "TOAST");
  console.log("   Owner Balance:", ethers.formatEther(ownerBalance), "TOAST");
  console.log("   Version:", version);
}

// Execute interaction script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Interaction failed:", error);
    process.exit(1);
  });
