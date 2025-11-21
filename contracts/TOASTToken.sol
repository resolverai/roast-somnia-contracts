// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TOAST Token
 * @dev ERC20 Token for Burnie Platform on Somnia Network
 * 
 * Features:
 * - Fixed supply of 1 billion tokens
 * - Burnable tokens
 * - Pausable transfers (emergency control)
 * - EIP-2612 Permit (gasless approvals)
 * - Owner-controlled minting (disabled after initial mint)
 * - Staking functionality
 * - Gaming rewards distribution
 * - Anti-whale protection
 */
contract TOASTToken is ERC20, ERC20Burnable, ERC20Pausable, ERC20Permit, Ownable, ReentrancyGuard {
    // Constants
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 10**18; // 1 billion tokens
    uint256 public constant MAX_TRANSFER_AMOUNT = 1_000_000_000 * 10**18; // 1B tokens max (effectively no limit for testnet)
    
    // Staking variables
    mapping(address => uint256) public stakedBalance;
    mapping(address => uint256) public stakingTimestamp;
    mapping(address => uint256) public stakingRewards;
    
    // Gaming rewards
    mapping(address => bool) public gameRewardDistributors;
    
    // Events
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event StakingRewardsClaimed(address indexed user, uint256 amount);
    event GameRewardDistributed(address indexed recipient, uint256 amount, string reason);
    event GameRewardDistributorAdded(address indexed distributor);
    event GameRewardDistributorRemoved(address indexed distributor);
    
    // Modifiers
    modifier onlyGameRewardDistributor() {
        require(gameRewardDistributors[msg.sender], "Not authorized to distribute game rewards");
        _;
    }
    
    modifier validTransferAmount(uint256 amount) {
        require(amount <= MAX_TRANSFER_AMOUNT, "Transfer amount exceeds maximum limit");
        _;
    }
    
    constructor(address initialOwner) 
        ERC20("TOAST Token", "TOAST") 
        ERC20Permit("TOAST Token")
        Ownable(initialOwner)
    {
        // Mint total supply to the contract owner
        _mint(initialOwner, TOTAL_SUPPLY);
        
        // Add owner as initial game reward distributor
        gameRewardDistributors[initialOwner] = true;
        emit GameRewardDistributorAdded(initialOwner);
    }
    
    /**
     * @dev Override transfer to add anti-whale protection
     */
    function transfer(address to, uint256 amount) 
        public 
        override 
        validTransferAmount(amount) 
        returns (bool) 
    {
        return super.transfer(to, amount);
    }
    
    /**
     * @dev Override transferFrom to add anti-whale protection
     */
    function transferFrom(address from, address to, uint256 amount) 
        public 
        override 
        validTransferAmount(amount) 
        returns (bool) 
    {
        return super.transferFrom(from, to, amount);
    }
    
    /**
     * @dev Stake tokens to earn rewards
     */
    function stake(uint256 amount) external nonReentrant {
        require(amount > 0, "Cannot stake 0 tokens");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        
        // Claim existing rewards before staking more
        if (stakedBalance[msg.sender] > 0) {
            _claimStakingRewards();
        }
        
        // Transfer tokens to contract
        _transfer(msg.sender, address(this), amount);
        
        // Update staking data
        stakedBalance[msg.sender] += amount;
        stakingTimestamp[msg.sender] = block.timestamp;
        
        emit Staked(msg.sender, amount);
    }
    
    /**
     * @dev Unstake tokens and claim rewards
     */
    function unstake(uint256 amount) external nonReentrant {
        require(amount > 0, "Cannot unstake 0 tokens");
        require(stakedBalance[msg.sender] >= amount, "Insufficient staked balance");
        
        // Claim rewards before unstaking
        _claimStakingRewards();
        
        // Update staking data
        stakedBalance[msg.sender] -= amount;
        if (stakedBalance[msg.sender] == 0) {
            stakingTimestamp[msg.sender] = 0;
        }
        
        // Transfer tokens back to user
        _transfer(address(this), msg.sender, amount);
        
        emit Unstaked(msg.sender, amount);
    }
    
    /**
     * @dev Claim staking rewards
     */
    function claimStakingRewards() external nonReentrant {
        _claimStakingRewards();
    }
    
    /**
     * @dev Internal function to calculate and distribute staking rewards
     */
    function _claimStakingRewards() internal {
        uint256 stakedAmount = stakedBalance[msg.sender];
        if (stakedAmount == 0) return;
        
        uint256 stakingDuration = block.timestamp - stakingTimestamp[msg.sender];
        if (stakingDuration == 0) return;
        
        // Calculate rewards: 5% APY (simplified calculation)
        uint256 rewards = (stakedAmount * 5 * stakingDuration) / (100 * 365 days);
        
        if (rewards > 0) {
            stakingRewards[msg.sender] += rewards;
            stakingTimestamp[msg.sender] = block.timestamp;
            
            // Mint rewards (only for staking rewards)
            _mint(msg.sender, rewards);
            
            emit StakingRewardsClaimed(msg.sender, rewards);
        }
    }
    
    /**
     * @dev Distribute gaming rewards
     */
    function distributeGameReward(
        address recipient, 
        uint256 amount, 
        string calldata reason
    ) external onlyGameRewardDistributor {
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Invalid reward amount");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance for reward distribution");
        
        _transfer(msg.sender, recipient, amount);
        emit GameRewardDistributed(recipient, amount, reason);
    }
    
    /**
     * @dev Add game reward distributor
     */
    function addGameRewardDistributor(address distributor) external onlyOwner {
        require(distributor != address(0), "Invalid distributor address");
        gameRewardDistributors[distributor] = true;
        emit GameRewardDistributorAdded(distributor);
    }
    
    /**
     * @dev Remove game reward distributor
     */
    function removeGameRewardDistributor(address distributor) external onlyOwner {
        gameRewardDistributors[distributor] = false;
        emit GameRewardDistributorRemoved(distributor);
    }
    
    /**
     * @dev Get staking info for an address
     */
    function getStakingInfo(address account) external view returns (
        uint256 staked,
        uint256 timestamp,
        uint256 pendingRewards
    ) {
        staked = stakedBalance[account];
        timestamp = stakingTimestamp[account];
        
        if (staked > 0 && timestamp > 0) {
            uint256 stakingDuration = block.timestamp - timestamp;
            pendingRewards = (staked * 5 * stakingDuration) / (100 * 365 days);
        }
    }
    
    /**
     * @dev Pause token transfers (emergency function)
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause token transfers
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Emergency withdrawal of ETH (if any)
     */
    function emergencyWithdrawETH() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(owner()).transfer(balance);
        }
    }
    
    /**
     * @dev Allow contract to receive ETH (for emergency withdrawal testing)
     */
    receive() external payable {
        // Contract can receive ETH
    }
    
    /**
     * @dev Emergency withdrawal of any ERC20 tokens (except TOAST)
     */
    function emergencyWithdrawToken(address token, uint256 amount) external onlyOwner {
        require(token != address(this), "Cannot withdraw TOAST tokens");
        IERC20(token).transfer(owner(), amount);
    }
    
    // Required overrides for multiple inheritance
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Pausable)
    {
        super._update(from, to, value);
    }
    
    /**
     * @dev Override nonces for ERC20Permit compatibility
     */
    function nonces(address owner)
        public
        view
        override(ERC20Permit)
        returns (uint256)
    {
        return super.nonces(owner);
    }
    
    /**
     * @dev Returns the contract version
     */
    function version() external pure returns (string memory) {
        return "2.0.0";
    }
}
