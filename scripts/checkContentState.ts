import { ethers } from "ethers";
import * as dotenv from "dotenv";

dotenv.config();

const CONTENT_REGISTRY_ADDRESS = process.env.CONTENT_REGISTRY_ADDRESS!;
const SOMNIA_RPC_URL = process.env.SOMNIA_RPC_URL!;
const CONTENT_ID = 552;

const CONTENT_REGISTRY_ABI = [
  "function getContent(uint256 _contentId) external view returns (tuple(uint256 contentId, address creator, address currentOwner, string contentHash, string personalizedHash, uint256 price, bool isAvailable, bool isApproved, bool isPersonalized, uint256 createdAt, uint256 approvedAt, uint256 soldAt, uint256 personalizedAt, string contentType))",
  "function isContentAvailable(uint256 _contentId) external view returns (bool)",
  "function contentExistsMap(uint256) external view returns (bool)"
];

async function main() {
  console.log("🔍 Checking Content State on Somnia Testnet");
  console.log("=" .repeat(60));
  
  // Connect to Somnia
  const provider = new ethers.JsonRpcProvider(SOMNIA_RPC_URL);
  const contract = new ethers.Contract(CONTENT_REGISTRY_ADDRESS, CONTENT_REGISTRY_ABI, provider);
  
  console.log(`\n📄 Content Registry: ${CONTENT_REGISTRY_ADDRESS}`);
  console.log(`📝 Content ID: ${CONTENT_ID}`);
  
  try {
    // Check if content exists
    const exists = await contract.contentExistsMap(CONTENT_ID);
    console.log(`\n✅ Content Exists: ${exists}`);
    
    if (!exists) {
      console.log("❌ Content not registered on-chain!");
      return;
    }
    
    // Get full content details
    const content = await contract.getContent(CONTENT_ID);
    
    console.log("\n📊 Content Details:");
    console.log("─".repeat(60));
    console.log(`   Content ID: ${content.contentId}`);
    console.log(`   Creator: ${content.creator}`);
    console.log(`   Current Owner: ${content.currentOwner}`);
    console.log(`   Content Hash: ${content.contentHash}`);
    console.log(`   Price: ${ethers.formatEther(content.price)} TOAST`);
    console.log(`   Is Available: ${content.isAvailable}`);
    console.log(`   Is Approved: ${content.isApproved}`);
    console.log(`   Is Personalized: ${content.isPersonalized}`);
    console.log(`   Content Type: ${content.contentType}`);
    console.log(`   Created At: ${new Date(Number(content.createdAt) * 1000).toISOString()}`);
    console.log(`   Approved At: ${content.approvedAt > 0 ? new Date(Number(content.approvedAt) * 1000).toISOString() : 'Not approved'}`);
    console.log(`   Sold At: ${content.soldAt > 0 ? new Date(Number(content.soldAt) * 1000).toISOString() : 'Not sold'}`);
    
    // Check availability
    const isAvailable = await contract.isContentAvailable(CONTENT_ID);
    console.log(`\n🎯 Is Available for Purchase: ${isAvailable}`);
    
    if (!isAvailable) {
      console.log("\n❌ ISSUE: Content is marked as NOT AVAILABLE!");
      console.log("   Possible reasons:");
      console.log("   - Content not approved yet");
      console.log("   - Content already sold");
      console.log("   - Content availability manually disabled");
    } else {
      console.log("\n✅ Content is available for purchase!");
    }
    
  } catch (error) {
    console.error("\n❌ Error checking content state:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

