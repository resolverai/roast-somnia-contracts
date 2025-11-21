import { ethers } from "ethers";
import * as dotenv from "dotenv";

dotenv.config();

// Contract configuration
const CONTENT_REGISTRY_ADDRESS = process.env.CONTENT_REGISTRY_ADDRESS || "0x8319877ed76390EbcC069eBf7Be1C9EC3E158E5c";
const SOMNIA_RPC_URL = process.env.SOMNIA_RPC_URL || "https://dream-rpc.somnia.network";

// Contract deployment block (found via binary search)
const DEPLOYMENT_BLOCK = 228437573;

// ContentRegistry ABI (minimal)
const CONTENT_REGISTRY_ABI = [
  "function totalContent() view returns (uint256)",
  "function contents(uint256) view returns (uint256 contentId, address creator, address currentOwner, string contentHash, string personalizedHash, uint256 price, bool isAvailable, bool isApproved, bool isPersonalized, uint256 createdAt, uint256 approvedAt, uint256 soldAt, uint256 personalizedAt, string contentType)",
  "function contentExistsMap(uint256) view returns (bool)",
  "event ContentRegistered(uint256 indexed contentId, address indexed creator, string contentHash, string contentType)",
  "event ContentPurchased(uint256 indexed contentId, address indexed buyer, address indexed creator, uint256 price)"
];

interface ContentStats {
  [address: string]: number;
}

interface PurchaseStats {
  [address: string]: number;
}

async function main() {
  console.log("📊 Content Analytics Dashboard");
  console.log("=".repeat(80));
  console.log(`\n🔗 Content Registry: ${CONTENT_REGISTRY_ADDRESS}`);
  console.log(`🌐 Network: Somnia Testnet\n`);

  // Connect to Somnia network
  const provider = new ethers.JsonRpcProvider(SOMNIA_RPC_URL);
  const contentRegistry = new ethers.Contract(
    CONTENT_REGISTRY_ADDRESS,
    CONTENT_REGISTRY_ABI,
    provider
  );

  try {
    // Get total content count
    const totalContent = await contentRegistry.totalContent();
    console.log(`📝 Total Content Registered: ${totalContent.toString()}\n`);

    if (totalContent.toString() === "0") {
      console.log("⚠️  No content found in the registry.");
      return;
    }

    // Get current block number
    const currentBlock = await provider.getBlockNumber();
    console.log(`📦 Current Block: ${currentBlock}`);
    console.log(`📦 Contract Deployment Block: ${DEPLOYMENT_BLOCK}`);
    console.log(`📊 Total blocks to scan: ${currentBlock - DEPLOYMENT_BLOCK}`);
    
    // Query events in chunks to avoid RPC limit (1000 blocks per query)
    const BLOCK_CHUNK_SIZE = 1000;
    const startBlock = DEPLOYMENT_BLOCK;
    const totalChunks = Math.ceil((currentBlock - startBlock) / BLOCK_CHUNK_SIZE);
    
    console.log(`🔍 Fetching events from block ${startBlock} to ${currentBlock}...`);
    console.log(`   (Processing ${totalChunks} chunks - this will take a few minutes)\n`);

    // Get ContentRegistered events in chunks
    console.log("🔍 Fetching content registration events...");
    const registeredFilter = contentRegistry.filters.ContentRegistered();
    let registeredEvents: any[] = [];
    
    let chunkCount = 0;
    
    for (let fromBlock = startBlock; fromBlock < currentBlock; fromBlock += BLOCK_CHUNK_SIZE) {
      const toBlock = Math.min(fromBlock + BLOCK_CHUNK_SIZE - 1, currentBlock);
      chunkCount++;
      
      // Show progress every 100 chunks to avoid cluttering output
      if (chunkCount % 100 === 0 || chunkCount === totalChunks) {
        console.log(`   Progress: ${chunkCount}/${totalChunks} chunks (${((chunkCount/totalChunks)*100).toFixed(1)}%) - Found ${registeredEvents.length} events so far`);
      }
      
      try {
        const events = await contentRegistry.queryFilter(registeredFilter, fromBlock, toBlock);
        registeredEvents = registeredEvents.concat(events);
      } catch (error) {
        console.log(`   Warning: Error fetching blocks ${fromBlock}-${toBlock}, skipping...`);
      }
    }
    console.log(`✅ Found ${registeredEvents.length} registration events\n`);
    
    // Get ContentPurchased events in chunks
    console.log("🔍 Fetching content purchase events...");
    const purchasedFilter = contentRegistry.filters.ContentPurchased();
    let purchasedEvents: any[] = [];
    
    chunkCount = 0;
    for (let fromBlock = startBlock; fromBlock < currentBlock; fromBlock += BLOCK_CHUNK_SIZE) {
      const toBlock = Math.min(fromBlock + BLOCK_CHUNK_SIZE - 1, currentBlock);
      chunkCount++;
      
      // Show progress every 100 chunks
      if (chunkCount % 100 === 0 || chunkCount === totalChunks) {
        console.log(`   Progress: ${chunkCount}/${totalChunks} chunks (${((chunkCount/totalChunks)*100).toFixed(1)}%) - Found ${purchasedEvents.length} events so far`);
      }
      
      try {
        const events = await contentRegistry.queryFilter(purchasedFilter, fromBlock, toBlock);
        purchasedEvents = purchasedEvents.concat(events);
      } catch (error) {
        console.log(`   Warning: Error fetching blocks ${fromBlock}-${toBlock}, skipping...`);
      }
    }
    console.log(`✅ Found ${purchasedEvents.length} purchase events\n`);

    // Track creator statistics
    const creatorStats: ContentStats = {};
    const creatorDetails: { [address: string]: { contentIds: number[], types: string[] } } = {};
    
    for (const event of registeredEvents) {
      if ('args' in event) {
        const creator = event.args?.creator;
        const contentId = event.args?.contentId;
        const contentType = event.args?.contentType;
        
        if (creator) {
          creatorStats[creator] = (creatorStats[creator] || 0) + 1;
          
          if (!creatorDetails[creator]) {
            creatorDetails[creator] = { contentIds: [], types: [] };
          }
          creatorDetails[creator].contentIds.push(Number(contentId));
          creatorDetails[creator].types.push(contentType);
        }
      }
    }

    // Track purchase statistics
    const purchaseStats: PurchaseStats = {};
    const purchaseDetails: { [address: string]: { contentIds: number[], totalSpent: bigint } } = {};
    
    for (const event of purchasedEvents) {
      if ('args' in event) {
        const buyer = event.args?.buyer;
        const contentId = event.args?.contentId;
        const price = event.args?.price;
        
        if (buyer) {
          purchaseStats[buyer] = (purchaseStats[buyer] || 0) + 1;
          
          if (!purchaseDetails[buyer]) {
            purchaseDetails[buyer] = { contentIds: [], totalSpent: 0n };
          }
          purchaseDetails[buyer].contentIds.push(Number(contentId));
          purchaseDetails[buyer].totalSpent += BigInt(price);
        }
      }
    }

    // Display Creator Statistics
    console.log("\n" + "=".repeat(80));
    console.log("📊 CONTENT CREATION STATISTICS");
    console.log("=".repeat(80));
    
    if (Object.keys(creatorStats).length === 0) {
      console.log("\n⚠️  No content creators found.");
    } else {
      // Sort creators by content count (descending)
      const sortedCreators = Object.entries(creatorStats).sort((a, b) => b[1] - a[1]);
      
      // Table header
      console.log("\n┌─────┬──────────────────────────────────────────────┬───────────────┬─────────────────┐");
      console.log("│ No. │ Creator Address                              │ Content Count │ Content Types   │");
      console.log("├─────┼──────────────────────────────────────────────┼───────────────┼─────────────────┤");
      
      let totalContentCreated = 0;
      
      sortedCreators.forEach(([creator, count], index) => {
        const types = [...new Set(creatorDetails[creator].types)].join(", ");
        const displayTypes = types.length > 15 ? types.substring(0, 12) + "..." : types;
        console.log(
          `│ ${String(index + 1).padStart(3)} │ ${creator.padEnd(44)} │ ${String(count).padStart(13)} │ ${displayTypes.padEnd(15)} │`
        );
        totalContentCreated += count;
      });
      
      // Total row
      console.log("├─────┴──────────────────────────────────────────────┴───────────────┴─────────────────┤");
      console.log(`│ TOTAL CONTENT CREATED                                              ${String(totalContentCreated).padStart(13)} │              │`);
      console.log("└────────────────────────────────────────────────────────────────────────────────────────┘");
      
      // Show content IDs for each creator
      console.log("\n📝 Detailed Breakdown:");
      sortedCreators.forEach(([creator, count]) => {
        const contentIds = creatorDetails[creator].contentIds.join(", ");
        console.log(`   ${creator}: ${count} content(s) [IDs: ${contentIds}]`);
      });
    }

    // Display Purchase Statistics
    console.log("\n" + "=".repeat(80));
    console.log("💰 CONTENT PURCHASE STATISTICS");
    console.log("=".repeat(80));
    
    if (Object.keys(purchaseStats).length === 0) {
      console.log("\n⚠️  No content purchases found.");
    } else {
      // Sort buyers by purchase count (descending)
      const sortedBuyers = Object.entries(purchaseStats).sort((a, b) => b[1] - a[1]);
      
      // Table header
      console.log("\n┌─────┬──────────────────────────────────────────────┬──────────────┬─────────────────────┐");
      console.log("│ No. │ Buyer Address                                │ Purchases    │ Total Spent (TOAST) │");
      console.log("├─────┼──────────────────────────────────────────────┼──────────────┼─────────────────────┤");
      
      let totalPurchases = 0;
      let totalSpentAll = 0n;
      
      sortedBuyers.forEach(([buyer, count], index) => {
        const totalSpent = ethers.formatEther(purchaseDetails[buyer].totalSpent);
        console.log(
          `│ ${String(index + 1).padStart(3)} │ ${buyer.padEnd(44)} │ ${String(count).padStart(12)} │ ${String(totalSpent).padStart(19)} │`
        );
        totalPurchases += count;
        totalSpentAll += purchaseDetails[buyer].totalSpent;
      });
      
      // Total row
      console.log("├─────┴──────────────────────────────────────────────┴──────────────┴─────────────────────┤");
      console.log(`│ TOTAL PURCHASES                                      ${String(totalPurchases).padStart(12)} │ ${String(ethers.formatEther(totalSpentAll)).padStart(19)} │`);
      console.log("└──────────────────────────────────────────────────────────────────────────────────────────┘");
      
      // Show content IDs for each buyer
      console.log("\n💳 Detailed Breakdown:");
      sortedBuyers.forEach(([buyer, count]) => {
        const contentIds = purchaseDetails[buyer].contentIds.join(", ");
        const totalSpent = ethers.formatEther(purchaseDetails[buyer].totalSpent);
        console.log(`   ${buyer}: ${count} purchase(s) [IDs: ${contentIds}] - Total: ${totalSpent} TOAST`);
      });
    }

    // Summary Statistics
    console.log("\n" + "=".repeat(80));
    console.log("📈 SUMMARY STATISTICS");
    console.log("=".repeat(80));
    console.log(`\n✅ Total Unique Creators: ${Object.keys(creatorStats).length}`);
    console.log(`✅ Total Unique Buyers: ${Object.keys(purchaseStats).length}`);
    console.log(`✅ Total Content Items: ${registeredEvents.length}`);
    console.log(`✅ Total Purchases: ${purchasedEvents.length}`);
    console.log(`✅ Purchase Rate: ${registeredEvents.length > 0 ? ((purchasedEvents.length / registeredEvents.length) * 100).toFixed(2) : 0}%`);
    
    // Content type breakdown
    if (registeredEvents.length > 0) {
      const typeBreakdown: { [type: string]: number } = {};
      for (const event of registeredEvents) {
        if ('args' in event) {
          const contentType = event.args?.contentType || "unknown";
          typeBreakdown[contentType] = (typeBreakdown[contentType] || 0) + 1;
        }
      }
      
      console.log("\n📊 Content by Type:");
      Object.entries(typeBreakdown).forEach(([type, count]) => {
        const percentage = ((count / registeredEvents.length) * 100).toFixed(2);
        console.log(`   ${type}: ${count} (${percentage}%)`);
      });
    }

    console.log("\n" + "=".repeat(80));
    console.log("✅ Analytics Complete!");
    console.log("=".repeat(80));
    
  } catch (error: any) {
    console.error("\n❌ Error fetching analytics:", error);
    if (error.message) {
      console.error("Error message:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

