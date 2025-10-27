// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title Content Reward Distribution
 * @dev Handles automated payout distribution for content purchases
 * 
 * Revenue Distribution:
 * - Miner: 50% of purchase price
 * - Evaluator: 20% of purchase price
 * - Platform: 30% of purchase price
 *   - Direct Referrer: 5-10% of purchase price (based on tier)
 *   - Grand Referrer: 2.5-5% of purchase price (based on tier)
 *   - Residual Platform: Remaining after referrals
 */
contract ContentRewardDistribution is Ownable, ReentrancyGuard, Pausable {
    
    // ========== ENUMS ==========
    enum TierLevel { SILVER, GOLD, PLATINUM, EMERALD, DIAMOND, UNICORN }
    
    // ========== STRUCTS ==========
    struct ReferralData {
        address directReferrer;
        address grandReferrer;
        TierLevel tier;
        bool isActive;
        uint256 totalEarnings;
        uint256 totalReferrals;
    }
    
    struct PayoutRecord {
        uint256 contentId;
        address buyer;
        address miner;
        uint256 totalAmount;
        uint256 minerAmount;
        uint256 evaluatorAmount;
        uint256 platformAmount;
        uint256 directReferrerAmount;
        uint256 grandReferrerAmount;
        uint256 residualPlatformAmount;
        uint256 timestamp;
        bool completed;
    }
    
    // ========== CONSTANTS ==========
    uint256 public constant MINER_RATE = 5000;      // 50% (5000/10000)
    uint256 public constant EVALUATOR_RATE = 2000;  // 20% (2000/10000)
    uint256 public constant PLATFORM_RATE = 3000;   // 30% (3000/10000)
    
    // ========== STATE VARIABLES ==========
    IERC20 public roastToken;
    address public evaluatorTreasury;
    address public platformTreasury;
    
    // Referral data
    mapping(address => ReferralData) public userReferrals;
    mapping(address => uint256) public totalReferralEarnings;
    mapping(uint256 => PayoutRecord) public payouts;
    uint256 public totalPayouts;
    
    // Commission rates by tier (as percentage of total purchase)
    mapping(TierLevel => uint256) public directReferrerRates;
    mapping(TierLevel => uint256) public grandReferrerRates;
    
    // ========== EVENTS ==========
    event ReferralRegistered(
        address indexed user,
        address indexed directReferrer,
        address indexed grandReferrer,
        TierLevel tier
    );
    
    event PayoutDistributed(
        uint256 indexed payoutId,
        uint256 indexed contentId,
        address indexed buyer,
        address miner,
        uint256 totalAmount,
        uint256 minerAmount,
        uint256 evaluatorAmount,
        uint256 platformAmount,
        uint256 directReferrerAmount,
        uint256 grandReferrerAmount,
        uint256 residualPlatformAmount
    );
    
    event TierUpdated(address indexed user, TierLevel oldTier, TierLevel newTier);
    event TreasuryUpdated(address indexed oldAddress, address indexed newAddress, string treasuryType);
    
    // ========== CONSTRUCTOR ==========
    constructor(
        address _roastToken,
        address _evaluatorTreasury,
        address _platformTreasury
    ) Ownable(msg.sender) {
        require(_roastToken != address(0), "Invalid token address");
        require(_evaluatorTreasury != address(0), "Invalid evaluator treasury");
        require(_platformTreasury != address(0), "Invalid platform treasury");
        
        roastToken = IERC20(_roastToken);
        evaluatorTreasury = _evaluatorTreasury;
        platformTreasury = _platformTreasury;
        
        _initializeReferralRates();
    }
    
    // ========== MAIN FUNCTIONS ==========
    /**
     * @dev Process complete payout distribution for content purchase
     * @param _contentId Content ID
     * @param _buyer Buyer's wallet address
     * @param _miner Miner's wallet address
     * @param _totalAmount Total purchase amount in ROAST
     * @return success Whether payout was successful
     */
    function processContentPurchase(
        uint256 _contentId,
        address _buyer,
        address _miner,
        uint256 _totalAmount
    ) external nonReentrant whenNotPaused returns (bool) {
        require(_buyer != address(0), "Invalid buyer address");
        require(_miner != address(0), "Invalid miner address");
        require(_totalAmount > 0, "Invalid amount");
        
        // Calculate base distribution
        uint256 minerAmount = (_totalAmount * MINER_RATE) / 10000;        // 50%
        uint256 evaluatorAmount = (_totalAmount * EVALUATOR_RATE) / 10000; // 20%
        uint256 platformAmount = (_totalAmount * PLATFORM_RATE) / 10000;   // 30%
        
        // Calculate referral payouts
        (uint256 directAmount, uint256 grandAmount, uint256 totalReferralAmount) = 
            _calculateReferralPayouts(_buyer, _totalAmount);
        
        // Calculate residual platform revenue
        uint256 residualPlatformAmount = platformAmount - totalReferralAmount;
        
        // Create payout record
        uint256 payoutId = totalPayouts++;
        payouts[payoutId] = PayoutRecord({
            contentId: _contentId,
            buyer: _buyer,
            miner: _miner,
            totalAmount: _totalAmount,
            minerAmount: minerAmount,
            evaluatorAmount: evaluatorAmount,
            platformAmount: platformAmount,
            directReferrerAmount: directAmount,
            grandReferrerAmount: grandAmount,
            residualPlatformAmount: residualPlatformAmount,
            timestamp: block.timestamp,
            completed: false
        });
        
        // Execute all transfers
        bool success = _executeTransfers(
            _miner,
            evaluatorAmount,
            residualPlatformAmount,
            _buyer,
            directAmount,
            grandAmount
        );
        
        if (success) {
            payouts[payoutId].completed = true;
            
            // Update referral statistics
            if (totalReferralAmount > 0) {
                _updateReferralStats(_buyer, directAmount, grandAmount);
            }
            
            emit PayoutDistributed(
                payoutId,
                _contentId,
                _buyer,
                _miner,
                _totalAmount,
                minerAmount,
                evaluatorAmount,
                platformAmount,
                directAmount,
                grandAmount,
                residualPlatformAmount
            );
        }
        
        return success;
    }
    
    /**
     * @dev Register a user with their referral chain
     * @param _user User's wallet address
     * @param _directReferrer Direct referrer's wallet address
     * @param _grandReferrer Grand referrer's wallet address (can be address(0))
     * @param _tier User's tier level
     */
    function registerReferral(
        address _user,
        address _directReferrer,
        address _grandReferrer,
        TierLevel _tier
    ) external onlyOwner {
        require(_user != address(0), "Invalid user address");
        require(_directReferrer != address(0), "Direct referrer required");
        require(_user != _directReferrer, "Cannot refer yourself");
        require(_user != _grandReferrer, "Cannot refer yourself");
        require(_directReferrer != _grandReferrer, "Direct and grand referrer cannot be same");
        
        userReferrals[_user] = ReferralData({
            directReferrer: _directReferrer,
            grandReferrer: _grandReferrer,
            tier: _tier,
            isActive: true,
            totalEarnings: 0,
            totalReferrals: 0
        });
        
        emit ReferralRegistered(_user, _directReferrer, _grandReferrer, _tier);
    }
    
    // ========== INTERNAL FUNCTIONS ==========
    /**
     * @dev Calculate referral payout amounts
     * @param _buyer Buyer's wallet address
     * @param _totalAmount Total purchase amount
     * @return directAmount Direct referrer amount
     * @return grandAmount Grand referrer amount
     * @return totalAmount Total referral amount
     */
    function _calculateReferralPayouts(
        address _buyer,
        uint256 _totalAmount
    ) internal view returns (uint256 directAmount, uint256 grandAmount, uint256 totalAmount) {
        ReferralData storage referralData = userReferrals[_buyer];
        
        if (!referralData.isActive) {
            return (0, 0, 0);
        }
        
        // Calculate direct referrer amount (5-10% of total purchase)
        directAmount = (_totalAmount * directReferrerRates[referralData.tier]) / 10000;
        
        // Calculate grand referrer amount (2.5-5% of total purchase)
        if (referralData.grandReferrer != address(0) && userReferrals[referralData.grandReferrer].isActive) {
            grandAmount = (_totalAmount * grandReferrerRates[referralData.tier]) / 10000;
        }
        
        totalAmount = directAmount + grandAmount;
    }
    
    /**
     * @dev Execute all token transfers
     * @param _miner Miner address
     * @param _evaluatorAmount Evaluator amount
     * @param _residualPlatformAmount Residual platform amount
     * @param _buyer Buyer address
     * @param _directAmount Direct referrer amount
     * @param _grandAmount Grand referrer amount
     * @return success Whether all transfers succeeded
     */
    function _executeTransfers(
        address _miner,
        uint256 _evaluatorAmount,
        uint256 _residualPlatformAmount,
        address _buyer,
        uint256 _directAmount,
        uint256 _grandAmount
    ) internal returns (bool) {
        uint256 payoutId = totalPayouts - 1;
        
        // Transfer to miner (50%)
        try roastToken.transfer(_miner, payouts[payoutId].minerAmount) {
            // Success
        } catch {
            return false;
        }
        
        // Transfer to evaluator treasury (20%)
        if (_evaluatorAmount > 0) {
            try roastToken.transfer(evaluatorTreasury, _evaluatorAmount) {
                // Success
            } catch {
                return false;
            }
        }
        
        // Transfer residual platform revenue
        if (_residualPlatformAmount > 0) {
            try roastToken.transfer(platformTreasury, _residualPlatformAmount) {
                // Success
            } catch {
                return false;
            }
        }
        
        // Transfer to direct referrer
        if (_directAmount > 0) {
            ReferralData storage referralData = userReferrals[_buyer];
            try roastToken.transfer(referralData.directReferrer, _directAmount) {
                // Success
            } catch {
                return false;
            }
        }
        
        // Transfer to grand referrer
        if (_grandAmount > 0) {
            ReferralData storage referralData = userReferrals[_buyer];
            try roastToken.transfer(referralData.grandReferrer, _grandAmount) {
                // Success
            } catch {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * @dev Update referral statistics
     * @param _buyer Buyer address
     * @param _directAmount Direct referrer amount
     * @param _grandAmount Grand referrer amount
     */
    function _updateReferralStats(
        address _buyer,
        uint256 _directAmount,
        uint256 _grandAmount
    ) internal {
        ReferralData storage referralData = userReferrals[_buyer];
        
        if (_directAmount > 0) {
            totalReferralEarnings[referralData.directReferrer] += _directAmount;
            userReferrals[referralData.directReferrer].totalEarnings += _directAmount;
            userReferrals[referralData.directReferrer].totalReferrals++;
        }
        
        if (_grandAmount > 0) {
            totalReferralEarnings[referralData.grandReferrer] += _grandAmount;
            userReferrals[referralData.grandReferrer].totalEarnings += _grandAmount;
        }
    }
    
    /**
     * @dev Initialize referral rates
     */
    function _initializeReferralRates() internal {
        // Direct referrer rates (5-10% of total purchase)
        directReferrerRates[TierLevel.SILVER] = 500;     // 5%
        directReferrerRates[TierLevel.GOLD] = 750;       // 7.5%
        directReferrerRates[TierLevel.PLATINUM] = 1000;  // 10%
        directReferrerRates[TierLevel.EMERALD] = 1000;   // 10%
        directReferrerRates[TierLevel.DIAMOND] = 1000;   // 10%
        directReferrerRates[TierLevel.UNICORN] = 1000;   // 10%
        
        // Grand referrer rates (2.5-5% of total purchase)
        grandReferrerRates[TierLevel.SILVER] = 250;      // 2.5%
        grandReferrerRates[TierLevel.GOLD] = 375;        // 3.75%
        grandReferrerRates[TierLevel.PLATINUM] = 500;    // 5%
        grandReferrerRates[TierLevel.EMERALD] = 500;     // 5%
        grandReferrerRates[TierLevel.DIAMOND] = 500;     // 5%
        grandReferrerRates[TierLevel.UNICORN] = 500;     // 5%
    }
    
    // ========== VIEW FUNCTIONS ==========
    /**
     * @dev Calculate referral payout amounts for a user
     * @param _buyer Buyer's wallet address
     * @param _totalPurchaseAmount Total purchase amount
     * @return directAmount Direct referrer amount
     * @return grandAmount Grand referrer amount
     * @return totalAmount Total referral amount
     */
    function calculateReferralPayout(
        address _buyer,
        uint256 _totalPurchaseAmount
    ) external view returns (uint256 directAmount, uint256 grandAmount, uint256 totalAmount) {
        return _calculateReferralPayouts(_buyer, _totalPurchaseAmount);
    }
    
    /**
     * @dev Get user's referral data
     * @param _user User's wallet address
     * @return referralData Complete referral data
     */
    function getUserReferralData(address _user) external view returns (ReferralData memory) {
        return userReferrals[_user];
    }
    
    /**
     * @dev Get payout record
     * @param _payoutId Payout ID
     * @return payout Complete payout data
     */
    function getPayoutRecord(uint256 _payoutId) external view returns (PayoutRecord memory) {
        return payouts[_payoutId];
    }
    
    /**
     * @dev Get total payouts count
     * @return count Total number of payouts
     */
    function getTotalPayouts() external view returns (uint256) {
        return totalPayouts;
    }
    
    // ========== ADMIN FUNCTIONS ==========
    /**
     * @dev Update user's tier level
     * @param _user User's wallet address
     * @param _newTier New tier level
     */
    function updateUserTier(address _user, TierLevel _newTier) external onlyOwner {
        require(userReferrals[_user].isActive, "User not registered");
        
        TierLevel oldTier = userReferrals[_user].tier;
        userReferrals[_user].tier = _newTier;
        
        emit TierUpdated(_user, oldTier, _newTier);
    }
    
    /**
     * @dev Update referral rates for a tier
     * @param _tier Tier level
     * @param _directRate Direct referrer rate (in basis points)
     * @param _grandRate Grand referrer rate (in basis points)
     */
    function updateReferralRates(
        TierLevel _tier,
        uint256 _directRate,
        uint256 _grandRate
    ) external onlyOwner {
        require(_directRate <= 1000, "Direct rate cannot exceed 10%");
        require(_grandRate <= 500, "Grand rate cannot exceed 5%");
        
        directReferrerRates[_tier] = _directRate;
        grandReferrerRates[_tier] = _grandRate;
    }
    
    /**
     * @dev Update evaluator treasury address
     * @param _evaluatorTreasury New evaluator treasury address
     */
    function setEvaluatorTreasury(address _evaluatorTreasury) external onlyOwner {
        require(_evaluatorTreasury != address(0), "Invalid address");
        address oldAddress = evaluatorTreasury;
        evaluatorTreasury = _evaluatorTreasury;
        emit TreasuryUpdated(oldAddress, _evaluatorTreasury, "evaluator");
    }
    
    /**
     * @dev Update platform treasury address
     * @param _platformTreasury New platform treasury address
     */
    function setPlatformTreasury(address _platformTreasury) external onlyOwner {
        require(_platformTreasury != address(0), "Invalid address");
        address oldAddress = platformTreasury;
        platformTreasury = _platformTreasury;
        emit TreasuryUpdated(oldAddress, _platformTreasury, "platform");
    }
    
    /**
     * @dev Deactivate user referral
     * @param _user User's wallet address
     */
    function deactivateReferral(address _user) external onlyOwner {
        userReferrals[_user].isActive = false;
    }
    
    /**
     * @dev Pause contract
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Emergency withdraw ERC20 tokens
     * @param _token Token address
     * @param _amount Amount to withdraw
     */
    function emergencyWithdrawToken(address _token, uint256 _amount) external onlyOwner {
        require(_token != address(0), "Invalid token address");
        IERC20(_token).transfer(owner(), _amount);
    }
}
