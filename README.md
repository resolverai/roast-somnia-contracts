# Burnie Web3 Smart Contracts

Smart contracts for the Burnie Platform deployed on Somnia Network.

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Somnia testnet ETH for deployment

### Installation
```bash
npm install
```

### Environment Setup
```bash
cp .env.example .env
# Edit .env with your private key and RPC URLs
```

### Compile Contracts
```bash
npm run compile
```

### Run Tests
```bash
npm test
```

### Deploy TOAST Token to Testnet
```bash
npm run deploy:toast:testnet
```

## 📋 Available Scripts

- `npm run compile` - Compile smart contracts
- `npm test` - Run test suite
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:gas` - Run tests with gas reporting
- `npm run deploy:toast:testnet` - Deploy TOAST token to Somnia testnet
- `npm run deploy:toast:mainnet` - Deploy TOAST token to Somnia mainnet
- `npm run interact:toast:testnet` - Interact with deployed TOAST token on testnet
- `npm run verify:testnet` - Verify contract on Somnia testnet explorer
- `npm run console:testnet` - Open Hardhat console connected to testnet
- `npm run clean` - Clean build artifacts
- `npm run lint` - Lint TypeScript files
- `npm run lint:fix` - Fix linting issues

## 📄 Contracts

### TOAST Token
- **File**: `contracts/TOASTToken.sol`
- **Type**: ERC-20 Token with staking and gaming features
- **Supply**: 1,000,000,000 TOAST (fixed supply)
- **Features**: Staking, gaming rewards, anti-whale protection, pausable

## 🌐 Networks

### Somnia Testnet
- **Chain ID**: 50311
- **RPC URL**: https://testnet-rpc.somnia.network
- **Explorer**: https://testnet-explorer.somnia.network

### Somnia Mainnet
- **Chain ID**: 2648
- **RPC URL**: https://rpc.somnia.network
- **Explorer**: https://explorer.somnia.network

## 📖 Documentation

See `TOAST_TOKEN_DOCUMENTATION.md` for detailed documentation on:
- Contract deployment
- Function reference
- Security considerations
- Troubleshooting

## 🔒 Security

- All contracts use OpenZeppelin's audited libraries
- ReentrancyGuard protection on state-changing functions
- Owner-only functions with proper access control
- Emergency pause functionality
- Anti-whale protection mechanisms

## 🧪 Testing

The test suite covers:
- ✅ ERC-20 standard compliance
- ✅ Staking functionality
- ✅ Gaming reward distribution
- ✅ Security features
- ✅ Edge cases and error conditions

## 📞 Support

For technical support:
- Review the documentation
- Check test cases for usage examples
- Test on Somnia testnet before mainnet deployment

## 📄 License

MIT License - see LICENSE file for details.
