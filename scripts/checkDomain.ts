import { ethers } from "ethers";

const TOAST_TOKEN_ADDRESS = "0x73e051113358CaBaAF6eC8d8C0E0FC97FC687379";
const SOMNIA_RPC_URL = "https://dream-rpc.somnia.network";

const TOAST_ABI = [
  "function name() view returns (string)",
  "function DOMAIN_SEPARATOR() view returns (bytes32)",
  "function eip712Domain() view returns (bytes1 fields, string name, string version, uint256 chainId, address verifyingContract, bytes32 salt, uint256[] extensions)"
];

async function main() {
  const provider = new ethers.JsonRpcProvider(SOMNIA_RPC_URL);
  const toast = new ethers.Contract(TOAST_TOKEN_ADDRESS, TOAST_ABI, provider);
  
  console.log("🔍 Checking TOAST Token EIP-712 Domain\n");
  
  const name = await toast.name();
  console.log("Token Name:", name);
  
  const domainSeparator = await toast.DOMAIN_SEPARATOR();
  console.log("Domain Separator:", domainSeparator);
  
  try {
    const domain = await toast.eip712Domain();
    console.log("\nEIP-712 Domain (from eip712Domain()):");
    console.log("  Name:", domain.name);
    console.log("  Version:", domain.version);
    console.log("  ChainId:", domain.chainId.toString());
    console.log("  VerifyingContract:", domain.verifyingContract);
  } catch (e) {
    console.log("\neip712Domain() not available, contract uses EIP-2612 defaults");
    console.log("OpenZeppelin ERC20Permit constructor parameter becomes the version");
  }
  
  // Calculate expected domain separator
  const domain1 = {
    name: name,
    version: '1',
    chainId: 50312,
    verifyingContract: TOAST_TOKEN_ADDRESS
  };
  
  const domain2 = {
    name: name,
    version: name, // Some contracts use name as version
    chainId: 50312,
    verifyingContract: TOAST_TOKEN_ADDRESS
  };
  
  const types = {
    EIP712Domain: [
      { name: 'name', type: 'string' },
      { name: 'version', type: 'string' },
      { name: 'chainId', type: 'uint256' },
      { name: 'verifyingContract', type: 'address' }
    ]
  };
  
  const calculated1 = ethers.TypedDataEncoder.hashDomain(domain1);
  const calculated2 = ethers.TypedDataEncoder.hashDomain(domain2);
  
  console.log("\nDomain Separator Comparison:");
  console.log("On-chain:", domainSeparator);
  console.log("Calculated (version='1'):", calculated1);
  console.log("Calculated (version=name):", calculated2);
  console.log("\nMatch with version='1':", calculated1 === domainSeparator);
  console.log("Match with version=name:", calculated2 === domainSeparator);
}

main().catch(console.error);

