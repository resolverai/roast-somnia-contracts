import { ethers } from 'hardhat';

async function main() {
  console.log('🔄 Setting Reward Distribution address in ContentRegistry...');
  
  const contentRegistryAddress = process.env.CONTENT_REGISTRY_ADDRESS || '0x8319877ed76390EbcC069eBf7Be1C9EC3E158E5c';
  const rewardDistributionAddress = process.env.REWARD_DISTRIBUTION_ADDRESS || '0xBc6e117dC467B0F276203d5015eea5B57547e7e6';
  
  const [deployer] = await ethers.getSigners();
  console.log('📝 Using account:', deployer.address);
  
  const contentRegistry = await ethers.getContractAt('ContentRegistry', contentRegistryAddress);
  
  console.log('⛓️ Setting reward distribution address...');
  const tx = await contentRegistry.setRewardDistribution(rewardDistributionAddress);
  await tx.wait();
  
  console.log('✅ Reward distribution address set successfully!');
  console.log('🔗 Transaction hash:', tx.hash);
  
  // Verify
  const currentAddress = await contentRegistry.rewardDistribution();
  console.log('✅ Current reward distribution address:', currentAddress);
  
  if (currentAddress.toLowerCase() === rewardDistributionAddress.toLowerCase()) {
    console.log('✅ Verification passed!');
  } else {
    console.log('❌ Verification failed!');
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
