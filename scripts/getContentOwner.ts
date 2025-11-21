import { ethers } from 'hardhat';
import * as dotenv from 'dotenv';

dotenv.config();

async function getContentOwner(contentId: number) {
  try {
    console.log('\n🔍 Fetching content owner from Somnia Testnet...\n');

    // Connect to Somnia Testnet
    const provider = new ethers.JsonRpcProvider(
      process.env.SOMNIA_TESTNET_RPC_URL || 'https://dream-rpc.somnia.network'
    );

    const contentRegistryAddress = process.env.CONTENT_REGISTRY_ADDRESS;
    if (!contentRegistryAddress) {
      throw new Error('CONTENT_REGISTRY_ADDRESS not set in .env');
    }

    // ContentRegistry ABI - only the functions we need
    const abi = [
      'function getContent(uint256 _contentId) view returns (tuple(uint256 contentId, address creator, address currentOwner, string contentHash, string personalizedHash, uint256 price, bool isAvailable, bool isApproved, bool isPersonalized, uint256 createdAt, uint256 approvedAt, uint256 soldAt, uint256 personalizedAt, string contentType))',
      'function getContentOwner(uint256 _contentId) view returns (address)',
    ];

    const contract = new ethers.Contract(contentRegistryAddress, abi, provider);

    console.log('📋 Query Details:');
    console.log('   Content ID:', contentId);
    console.log('   Contract:', contentRegistryAddress);
    console.log('   Network: Somnia Testnet');
    console.log('   RPC:', process.env.SOMNIA_TESTNET_RPC_URL);
    console.log('');

    // Get content owner
    console.log('⏳ Fetching content owner...');
    const owner = await contract.getContentOwner(contentId);
    
    console.log('✅ Content Owner:', owner);
    console.log('');

    // Get full content details
    console.log('⏳ Fetching full content details...');
    const content = await contract.getContent(contentId);
    
    console.log('📊 Full Content Details:');
    console.log('   Content ID:', content.contentId.toString());
    console.log('   Creator:', content.creator);
    console.log('   Current Owner:', content.currentOwner);
    console.log('   Content Hash:', content.contentHash);
    console.log('   Personalized Hash:', content.personalizedHash || '(none)');
    console.log('   Price:', ethers.formatEther(content.price), 'TOAST');
    console.log('   Is Available:', content.isAvailable);
    console.log('   Is Approved:', content.isApproved);
    console.log('   Is Personalized:', content.isPersonalized);
    console.log('   Content Type:', content.contentType);
    console.log('');
    console.log('   Created At:', new Date(Number(content.createdAt) * 1000).toISOString());
    
    if (content.approvedAt > 0) {
      console.log('   Approved At:', new Date(Number(content.approvedAt) * 1000).toISOString());
    }
    
    if (content.soldAt > 0) {
      console.log('   Sold At:', new Date(Number(content.soldAt) * 1000).toISOString());
    }
    
    if (content.personalizedAt > 0) {
      console.log('   Personalized At:', new Date(Number(content.personalizedAt) * 1000).toISOString());
    }
    
    console.log('');

    // Check ownership status
    if (content.currentOwner === content.creator) {
      console.log('🔵 Status: Content is still owned by the creator');
    } else if (content.currentOwner === ethers.ZeroAddress) {
      console.log('⚪ Status: Content has no owner (zero address)');
    } else {
      console.log('🟢 Status: Content has been purchased');
      console.log('   Previous Owner (Creator):', content.creator);
      console.log('   New Owner (Buyer):', content.currentOwner);
    }
    console.log('');

  } catch (error: any) {
    console.error('❌ Error fetching content owner:', error.message);
    if (error.data) {
      console.error('Error data:', error.data);
    }
    process.exit(1);
  }
}

// Get content ID from environment variable or command line
const contentId = process.env.CONTENT_ID 
  ? parseInt(process.env.CONTENT_ID) 
  : (process.argv[2] ? parseInt(process.argv[2]) : null);

if (!contentId) {
  console.error('❌ Please provide a content ID');
  console.log('Usage: CONTENT_ID=558 npm run get-content-owner');
  console.log('   or: npm run get-content-owner (defaults to 558)');
  process.exit(1);
}

getContentOwner(contentId);

