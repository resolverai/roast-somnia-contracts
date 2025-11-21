// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";

/**
 * @title Content Registry
 * @dev Manages content ownership and marketplace functionality
 * 
 * Features:
 * - Content registration and approval
 * - Ownership tracking
 * - Purchase functionality
 * - Personalization tracking
 * - Integration with reward distribution
 */
contract ContentRegistry is Ownable, ReentrancyGuard, Pausable {
    
    // ========== STRUCTS ==========
    struct Content {
        uint256 contentId;           // Database content ID
        address creator;             // Miner who created content
        address currentOwner;        // Current owner (creator initially, buyer after purchase)
        string contentHash;          // IPFS/S3 hash of original content
        string personalizedHash;     // IPFS/S3 hash of personalized content (if personalized)
        uint256 price;              // Content price in ROAST
        bool isAvailable;           // Available for purchase
        bool isApproved;            // Approval status
        bool isPersonalized;        // Has been personalized
        uint256 createdAt;          // Creation timestamp
        uint256 approvedAt;         // Approval timestamp
        uint256 soldAt;             // Sale timestamp
        uint256 personalizedAt;     // Personalization timestamp
        string contentType;         // "text", "image", "video", "audio"
    }
    
    // ========== STATE VARIABLES ==========
    mapping(uint256 => Content) public contents;
    mapping(address => uint256[]) public userContents;
    mapping(uint256 => bool) public contentExistsMap;
    
    uint256 public totalContent;
    address public rewardDistribution;
    address public roastToken;
    
    // ========== EVENTS ==========
    event ContentRegistered(
        uint256 indexed contentId,
        address indexed creator,
        string contentHash,
        string contentType
    );
    
    event ContentApproved(
        uint256 indexed contentId,
        address indexed creator,
        uint256 price,
        string contentType
    );
    
    event ContentPurchased(
        uint256 indexed contentId,
        address indexed buyer,
        address indexed creator,
        uint256 price
    );
    
    event ContentPersonalized(
        uint256 indexed contentId,
        address indexed owner,
        string personalizedHash
    );
    
    event PriceUpdated(
        uint256 indexed contentId,
        uint256 oldPrice,
        uint256 newPrice
    );
    
    event RewardDistributionUpdated(address indexed oldAddress, address indexed newAddress);
    event RoastTokenUpdated(address indexed oldAddress, address indexed newAddress);
    
    // ========== MODIFIERS ==========
    modifier onlyRewardDistribution() {
        require(msg.sender == rewardDistribution, "Only reward distribution contract");
        _;
    }
    
    modifier contentExists(uint256 _contentId) {
        require(contentExistsMap[_contentId], "Content does not exist");
        _;
    }
    
    // ========== CONSTRUCTOR ==========
    constructor(address _roastToken) Ownable(msg.sender) {
        roastToken = _roastToken;
    }
    
    // ========== CONTENT REGISTRATION ==========
    /**
     * @dev Register content when AI generates it (pending approval)
     * @param _contentId Database content ID
     * @param _creator Content creator address
     * @param _contentHash IPFS/S3 hash of content
     * @param _contentType Type of content
     */
    function registerContent(
        uint256 _contentId,
        address _creator,
        string memory _contentHash,
        string memory _contentType
    ) external {
        require(_creator != address(0), "Invalid creator address");
        require(!contentExistsMap[_contentId], "Content already exists");
        require(bytes(_contentHash).length > 0, "Content hash required");
        require(bytes(_contentType).length > 0, "Content type required");
        
        contents[_contentId] = Content({
            contentId: _contentId,
            creator: _creator,
            currentOwner: _creator, // Creator is the initial owner
            contentHash: _contentHash,
            personalizedHash: "",
            price: 0,
            isAvailable: false,
            isApproved: false,
            isPersonalized: false,
            createdAt: block.timestamp,
            approvedAt: 0,
            soldAt: 0,
            personalizedAt: 0,
            contentType: _contentType
        });
        
        contentExistsMap[_contentId] = true;
        totalContent++;
        
        emit ContentRegistered(_contentId, _creator, _contentHash, _contentType);
    }
    
    /**
     * @dev Approve content and assign ownership to creator
     * @param _contentId Content ID
     * @param _price Content price in ROAST
     */
    function approveContent(
        uint256 _contentId,
        uint256 _price
    ) external onlyOwner contentExists(_contentId) {
        Content storage content = contents[_contentId];
        require(!content.isApproved, "Content already approved");
        require(_price > 0, "Price must be greater than 0");
        
        content.currentOwner = content.creator;
        content.price = _price;
        content.isAvailable = true;
        content.isApproved = true;
        content.approvedAt = block.timestamp;
        
        userContents[content.creator].push(_contentId);
        
        emit ContentApproved(_contentId, content.creator, _price, content.contentType);
    }
    
    /**
     * @dev Update content price after approval
     * @param _contentId Content ID
     * @param _newPrice New content price in ROAST
     */
    function updatePrice(
        uint256 _contentId,
        uint256 _newPrice
    ) external onlyOwner contentExists(_contentId) {
        Content storage content = contents[_contentId];
        require(content.isApproved, "Content not approved yet");
        require(content.isAvailable, "Content already sold");
        require(_newPrice > 0, "Price must be greater than 0");
        
        uint256 oldPrice = content.price;
        content.price = _newPrice;
        
        emit PriceUpdated(_contentId, oldPrice, _newPrice);
    }
    
    // ========== CONTENT PURCHASE ==========
    /**
     * @dev Purchase content (requires prior approval)
     * @param _contentId Content ID to purchase
     */
    function purchaseContent(uint256 _contentId) external nonReentrant whenNotPaused contentExists(_contentId) {
        Content storage content = contents[_contentId];
        require(content.isAvailable, "Content not available");
        
        address previousOwner = content.currentOwner;
        
        // Transfer TOAST tokens from buyer to this contract
        IERC20(roastToken).transferFrom(msg.sender, address(this), content.price);
        
        // Transfer ownership
        content.currentOwner = msg.sender;
        content.isAvailable = false;
        content.soldAt = block.timestamp;
        
        // Update user contents
        userContents[msg.sender].push(_contentId);
        
        // Process reward distribution
        if (rewardDistribution != address(0)) {
            // Transfer tokens to reward distribution contract
            IERC20(roastToken).transfer(rewardDistribution, content.price);
            
            IContentRewardDistribution(rewardDistribution).processContentPurchase(
                _contentId,
                msg.sender,
                previousOwner,
                content.price
            );
        }
        
        emit ContentPurchased(_contentId, msg.sender, previousOwner, content.price);
    }
    
    /**
     * @dev Purchase content with permit (single transaction)
     * @param _contentId Content ID to purchase
     * @param _deadline Permit deadline
     * @param _v Permit signature v
     * @param _r Permit signature r
     * @param _s Permit signature s
     */
    function purchaseContentWithPermit(
        uint256 _contentId,
        uint256 _deadline,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) external nonReentrant whenNotPaused contentExists(_contentId) {
        Content storage content = contents[_contentId];
        require(content.isAvailable, "Content not available");
        
        address previousOwner = content.currentOwner;
        
        // Execute permit (gasless approval)
        IERC20Permit(roastToken).permit(
            msg.sender,
            address(this),
            content.price,
            _deadline,
            _v,
            _r,
            _s
        );
        
        // Transfer TOAST tokens from buyer to this contract
        IERC20(roastToken).transferFrom(msg.sender, address(this), content.price);
        
        // Transfer ownership
        content.currentOwner = msg.sender;
        content.isAvailable = false;
        content.soldAt = block.timestamp;
        
        // Update user contents
        userContents[msg.sender].push(_contentId);
        
        // Process reward distribution
        if (rewardDistribution != address(0)) {
            // Transfer tokens to reward distribution contract
            IERC20(roastToken).transfer(rewardDistribution, content.price);
            
            IContentRewardDistribution(rewardDistribution).processContentPurchase(
                _contentId,
                msg.sender,
                previousOwner,
                content.price
            );
        }
        
        emit ContentPurchased(_contentId, msg.sender, previousOwner, content.price);
    }
    
    // ========== CONTENT PERSONALIZATION ==========
    /**
     * @dev Mark content as personalized
     * @param _contentId Content ID
     * @param _personalizedHash IPFS/S3 hash of personalized content
     */
    function markContentPersonalized(
        uint256 _contentId,
        string memory _personalizedHash
    ) external contentExists(_contentId) {
        Content storage content = contents[_contentId];
        require(content.currentOwner == msg.sender, "Not content owner");
        require(!content.isPersonalized, "Already personalized");
        require(bytes(_personalizedHash).length > 0, "Personalized hash required");
        
        content.personalizedHash = _personalizedHash;
        content.isPersonalized = true;
        content.personalizedAt = block.timestamp;
        
        emit ContentPersonalized(_contentId, msg.sender, _personalizedHash);
    }
    
    // ========== VIEW FUNCTIONS ==========
    /**
     * @dev Get content details
     * @param _contentId Content ID
     * @return Content struct
     */
    function getContent(uint256 _contentId) external view contentExists(_contentId) returns (Content memory) {
        return contents[_contentId];
    }
    
    /**
     * @dev Get content owner
     * @param _contentId Content ID
     * @return Owner address
     */
    function getContentOwner(uint256 _contentId) external view contentExists(_contentId) returns (address) {
        return contents[_contentId].currentOwner;
    }
    
    /**
     * @dev Check if content is available
     * @param _contentId Content ID
     * @return True if available
     */
    function isContentAvailable(uint256 _contentId) external view contentExists(_contentId) returns (bool) {
        return contents[_contentId].isAvailable;
    }
    
    /**
     * @dev Get user's content IDs
     * @param _user User address
     * @return Array of content IDs
     */
    function getUserContents(address _user) external view returns (uint256[] memory) {
        return userContents[_user];
    }
    
    /**
     * @dev Get content count for user
     * @param _user User address
     * @return Content count
     */
    function getUserContentCount(address _user) external view returns (uint256) {
        return userContents[_user].length;
    }
    
    // ========== ADMIN FUNCTIONS ==========
    /**
     * @dev Set reward distribution contract
     * @param _rewardDistribution New reward distribution address
     */
    function setRewardDistribution(address _rewardDistribution) external onlyOwner {
        address oldAddress = rewardDistribution;
        rewardDistribution = _rewardDistribution;
        emit RewardDistributionUpdated(oldAddress, _rewardDistribution);
    }
    
    /**
     * @dev Set ROAST token address
     * @param _roastToken New ROAST token address
     */
    function setRoastToken(address _roastToken) external onlyOwner {
        require(_roastToken != address(0), "Invalid token address");
        address oldAddress = roastToken;
        roastToken = _roastToken;
        emit RoastTokenUpdated(oldAddress, _roastToken);
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
     * @dev Emergency withdraw ETH
     */
    function emergencyWithdrawETH() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(owner()).transfer(balance);
        }
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
    
    /**
     * @dev Allow contract to receive ETH
     */
    receive() external payable {
        // Contract can receive ETH
    }
}

// ========== INTERFACES ==========
interface IContentRewardDistribution {
    function processContentPurchase(
        uint256 _contentId,
        address _buyer,
        address _miner,
        uint256 _totalAmount
    ) external;
}

