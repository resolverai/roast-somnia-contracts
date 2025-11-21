import { ethers } from "ethers";
import * as dotenv from "dotenv";

dotenv.config();

const TOAST_TOKEN_ADDRESS = "0x73e051113358CaBaAF6eC8d8C0E0FC97FC687379";
const CONTENT_REGISTRY_ADDRESS = "0x8319877ed76390EbcC069eBf7Be1C9EC3E158E5c";
const SOMNIA_RPC_URL = "https://dream-rpc.somnia.network";
const BUYER_ADDRESS = "0x5Dd40700322E19c0a99d0DD51129d8C25bd479A2";
const BUYER_PRIVATE_KEY = process.env.BUYER_PRIVATE_KEY!;

const TOAST_ABI = [
  "function name() view returns (string)",
  "function version() view returns (string)",
  "function DOMAIN_SEPARATOR() view returns (bytes32)",
  "function nonces(address owner) view returns (uint256)",
  "function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)"
];

async function main() {
  console.log("🔍 Testing TOAST Token Permit Functionality");
  console.log("=".repeat(70));
  
  // Connect to Somnia
  const provider = new ethers.JsonRpcProvider(SOMNIA_RPC_URL);
  const signer = new ethers.Wallet(BUYER_PRIVATE_KEY, provider);
  const toastToken = new ethers.Contract(TOAST_TOKEN_ADDRESS, TOAST_ABI, signer);
  
  console.log("\n📄 Contract Info:");
  console.log("   TOAST Token:", TOAST_TOKEN_ADDRESS);
  console.log("   Content Registry:", CONTENT_REGISTRY_ADDRESS);
  console.log("   Buyer:", BUYER_ADDRESS);
  
  try {
    // Get token details
    const name = await toastToken.name();
    console.log("\n✅ Token Name:", name);
    
    try {
      const version = await toastToken.version();
      console.log("✅ Token Version:", version);
    } catch (e) {
      console.log("⚠️  version() function not available (using EIP-2612 default)");
    }
    
    const domainSeparator = await toastToken.DOMAIN_SEPARATOR();
    console.log("✅ Domain Separator:", domainSeparator);
    
    const nonce = await toastToken.nonces(BUYER_ADDRESS);
    console.log("✅ Current Nonce:", nonce.toString());
    
    const balance = await toastToken.balanceOf(BUYER_ADDRESS);
    console.log("✅ TOAST Balance:", ethers.formatEther(balance), "TOAST");
    
    const allowance = await toastToken.allowance(BUYER_ADDRESS, CONTENT_REGISTRY_ADDRESS);
    console.log("✅ Current Allowance:", ethers.formatEther(allowance), "TOAST");
    
    // Create permit signature
    console.log("\n🔐 Creating Permit Signature...");
    const value = ethers.parseEther("999"); // 999 TOAST
    const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    
    // Domain for EIP-712
    const domain = {
      name: name,
      version: '1', // Try version 1 first
      chainId: 50312,
      verifyingContract: TOAST_TOKEN_ADDRESS
    };
    
    console.log("📝 Domain:", JSON.stringify(domain, null, 2));
    
    const types = {
      Permit: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' }
      ]
    };
    
    const message = {
      owner: BUYER_ADDRESS,
      spender: CONTENT_REGISTRY_ADDRESS,
      value: value,
      nonce: nonce,
      deadline: deadline
    };
    
    console.log("📝 Message:", JSON.stringify(message, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    , 2));
    
    // Sign the permit
    const signature = await signer.signTypedData(domain, types, message);
    console.log("✅ Signature:", signature);
    
    // Split signature
    const sig = ethers.Signature.from(signature);
    console.log("✅ v:", sig.v);
    console.log("✅ r:", sig.r);
    console.log("✅ s:", sig.s);
    
    // Test permit call
    console.log("\n🧪 Testing Permit Call...");
    const tx = await toastToken.permit(
      BUYER_ADDRESS,
      CONTENT_REGISTRY_ADDRESS,
      value,
      deadline,
      sig.v,
      sig.r,
      sig.s
    );
    
    console.log("⏳ Transaction sent:", tx.hash);
    const receipt = await tx.wait();
    console.log("✅ Permit successful! Gas used:", receipt.gasUsed.toString());
    
    // Check new allowance
    const newAllowance = await toastToken.allowance(BUYER_ADDRESS, CONTENT_REGISTRY_ADDRESS);
    console.log("✅ New Allowance:", ethers.formatEther(newAllowance), "TOAST");
    
    console.log("\n🎉 PERMIT TEST SUCCESSFUL!");
    
  } catch (error: any) {
    console.error("\n❌ Error:", error);
    if (error.data) {
      console.error("❌ Error Data:", error.data);
    }
    if (error.reason) {
      console.error("❌ Reason:", error.reason);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

