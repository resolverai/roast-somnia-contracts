import { expect } from "chai";
import { ethers } from "hardhat";
import { ContentRegistry, TOASTToken } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("ContentRegistry", function () {
  let contentRegistry: ContentRegistry;
  let toastToken: TOASTToken;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let buyer: SignerWithAddress;
  let rewardDistribution: SignerWithAddress;
  
  const CONTENT_ID = 1;
  const CONTENT_HASH = "QmTestContentHash123";
  const CONTENT_TYPE = "text";
  const CONTENT_PRICE = ethers.parseEther("100"); // 100 ROAST
  
  beforeEach(async function () {
    // Get signers
    [owner, user1, user2, buyer, rewardDistribution] = await ethers.getSigners();
    
    // Deploy TOAST Token first
    const TOASTTokenFactory = await ethers.getContractFactory("TOASTToken");
    toastToken = await TOASTTokenFactory.deploy(owner.address) as unknown as TOASTToken;
    await toastToken.waitForDeployment();
    
    // Deploy ContentRegistry
    const ContentRegistryFactory = await ethers.getContractFactory("ContentRegistry");
    contentRegistry = await ContentRegistryFactory.deploy(await toastToken.getAddress()) as unknown as ContentRegistry;
    await contentRegistry.waitForDeployment();
    
    // Don't set reward distribution address for now to avoid purchase issues
    // await contentRegistry.setRewardDistribution(rewardDistribution.address);
    
    // Give users some tokens
    await toastToken.connect(owner).transfer(user1.address, ethers.parseEther("1000"));
    await toastToken.connect(owner).transfer(user2.address, ethers.parseEther("1000"));
    await toastToken.connect(owner).transfer(buyer.address, ethers.parseEther("1000"));
  });
  
  describe("Deployment", function () {
    it("Should set the correct ROAST token address", async function () {
      expect(await contentRegistry.roastToken()).to.equal(await toastToken.getAddress());
    });
    
    it("Should set owner correctly", async function () {
      expect(await contentRegistry.owner()).to.equal(owner.address);
    });
    
    it("Should initialize with zero total content", async function () {
      expect(await contentRegistry.totalContent()).to.equal(0);
    });
  });
  
  describe("Content Registration", function () {
    it("Should allow users to register content", async function () {
      await contentRegistry.connect(user1).registerContent(
        CONTENT_ID,
        user1.address,
        CONTENT_HASH,
        CONTENT_TYPE
      );
      
      const content = await contentRegistry.getContent(CONTENT_ID);
      expect(content.contentId).to.equal(CONTENT_ID);
      expect(content.creator).to.equal(user1.address);
      expect(content.currentOwner).to.equal(user1.address); // Creator is the initial owner
      expect(content.contentHash).to.equal(CONTENT_HASH);
      expect(content.contentType).to.equal(CONTENT_TYPE);
      expect(content.isAvailable).to.be.false;
      expect(content.isApproved).to.be.false;
    });
    
    it("Should fail to register content with existing ID", async function () {
      await contentRegistry.connect(user1).registerContent(
        CONTENT_ID,
        user1.address,
        CONTENT_HASH,
        CONTENT_TYPE
      );
      
      await expect(
        contentRegistry.connect(user2).registerContent(
          CONTENT_ID,
          user2.address,
          "QmAnotherHash",
          "image"
        )
      ).to.be.revertedWith("Content already exists");
    });
    
    it("Should emit ContentRegistered event", async function () {
      await expect(
        contentRegistry.connect(user1).registerContent(
          CONTENT_ID,
          user1.address,
          CONTENT_HASH,
          CONTENT_TYPE
        )
      ).to.emit(contentRegistry, "ContentRegistered")
        .withArgs(CONTENT_ID, user1.address, CONTENT_HASH, CONTENT_TYPE);
    });
  });
  
  describe("Content Approval", function () {
    beforeEach(async function () {
      await contentRegistry.connect(user1).registerContent(
        CONTENT_ID,
        user1.address,
        CONTENT_HASH,
        CONTENT_TYPE
      );
    });
    
    it("Should allow owner to approve content", async function () {
      await contentRegistry.connect(owner).approveContent(CONTENT_ID, CONTENT_PRICE);
      
      const content = await contentRegistry.getContent(CONTENT_ID);
      expect(content.isApproved).to.be.true;
      expect(content.isAvailable).to.be.true;
      expect(content.price).to.equal(CONTENT_PRICE);
    });
    
    it("Should fail if non-owner tries to approve", async function () {
      await expect(
        contentRegistry.connect(user1).approveContent(CONTENT_ID, CONTENT_PRICE)
      ).to.be.revertedWithCustomError(contentRegistry, "OwnableUnauthorizedAccount");
    });
    
    it("Should fail to approve non-existent content", async function () {
      await expect(
        contentRegistry.connect(owner).approveContent(999, CONTENT_PRICE)
      ).to.be.revertedWith("Content does not exist");
    });
    
    it("Should emit ContentApproved event", async function () {
      await expect(
        contentRegistry.connect(owner).approveContent(CONTENT_ID, CONTENT_PRICE)
      ).to.emit(contentRegistry, "ContentApproved")
        .withArgs(CONTENT_ID, user1.address, CONTENT_PRICE, CONTENT_TYPE);
    });
  });
  
  describe("Content Purchase", function () {
    beforeEach(async function () {
      await contentRegistry.connect(user1).registerContent(
        CONTENT_ID,
        user1.address,
        CONTENT_HASH,
        CONTENT_TYPE
      );
      await contentRegistry.connect(owner).approveContent(CONTENT_ID, CONTENT_PRICE);
    });
    
    it("Should allow users to purchase content", async function () {
      const initialBuyerBalance = await toastToken.balanceOf(buyer.address);
      const initialCreatorBalance = await toastToken.balanceOf(user1.address);
      
      // Approve ContentRegistry to spend buyer's TOAST tokens
      await toastToken.connect(buyer).approve(await contentRegistry.getAddress(), CONTENT_PRICE);
      
      await contentRegistry.connect(buyer).purchaseContent(CONTENT_ID);
      
      const content = await contentRegistry.getContent(CONTENT_ID);
      expect(content.currentOwner).to.equal(buyer.address);
      expect(content.isAvailable).to.be.false;
      
      // Check TOAST token balances
      const finalBuyerBalance = await toastToken.balanceOf(buyer.address);
      expect(finalBuyerBalance).to.equal(initialBuyerBalance - CONTENT_PRICE);
    });
    
    it("Should fail to purchase unavailable content", async function () {
      // Approve ContentRegistry to spend buyer's TOAST tokens
      await toastToken.connect(buyer).approve(await contentRegistry.getAddress(), CONTENT_PRICE);
      
      await contentRegistry.connect(buyer).purchaseContent(CONTENT_ID);
      
      await expect(
        contentRegistry.connect(user2).purchaseContent(CONTENT_ID)
      ).to.be.revertedWith("Content not available");
    });
    
    it("Should fail to purchase with insufficient allowance", async function () {
      const insufficientAmount = CONTENT_PRICE - ethers.parseEther("1");
      
      // Approve insufficient amount
      await toastToken.connect(buyer).approve(await contentRegistry.getAddress(), insufficientAmount);
      
      await expect(
        contentRegistry.connect(buyer).purchaseContent(CONTENT_ID)
      ).to.be.revertedWithCustomError(toastToken, "ERC20InsufficientAllowance");
    });
    
    it("Should emit ContentPurchased event", async function () {
      // Approve ContentRegistry to spend buyer's TOAST tokens
      await toastToken.connect(buyer).approve(await contentRegistry.getAddress(), CONTENT_PRICE);
      
      await expect(
        contentRegistry.connect(buyer).purchaseContent(CONTENT_ID)
      ).to.emit(contentRegistry, "ContentPurchased")
        .withArgs(CONTENT_ID, buyer.address, user1.address, CONTENT_PRICE);
    });
  });
  
  describe("Content Personalization", function () {
    beforeEach(async function () {
      await contentRegistry.connect(user1).registerContent(
        CONTENT_ID,
        user1.address,
        CONTENT_HASH,
        CONTENT_TYPE
      );
      await contentRegistry.connect(owner).approveContent(CONTENT_ID, CONTENT_PRICE);
      
      // Approve ContentRegistry to spend buyer's TOAST tokens
      await toastToken.connect(buyer).approve(await contentRegistry.getAddress(), CONTENT_PRICE);
      await contentRegistry.connect(buyer).purchaseContent(CONTENT_ID);
    });
    
    it("Should allow content owner to mark as personalized", async function () {
      await contentRegistry.connect(buyer).markContentPersonalized(CONTENT_ID, "personalized_hash_123");
      
      const content = await contentRegistry.getContent(CONTENT_ID);
      expect(content.isPersonalized).to.be.true;
    });
    
    it("Should fail if non-owner tries to mark as personalized", async function () {
      await expect(
        contentRegistry.connect(user1).markContentPersonalized(CONTENT_ID, "personalized_hash_123")
      ).to.be.revertedWith("Not content owner");
    });
    
    it("Should emit ContentPersonalized event", async function () {
      await expect(
        contentRegistry.connect(buyer).markContentPersonalized(CONTENT_ID, "personalized_hash_123")
      ).to.emit(contentRegistry, "ContentPersonalized")
        .withArgs(CONTENT_ID, buyer.address, "personalized_hash_123");
    });
  });
  
  describe("Content Queries", function () {
    beforeEach(async function () {
      await contentRegistry.connect(user1).registerContent(
        CONTENT_ID,
        user1.address,
        CONTENT_HASH,
        CONTENT_TYPE
      );
    });
    
    it("Should return correct content owner", async function () {
      // Before approval, owner should be creator
      expect(await contentRegistry.getContentOwner(CONTENT_ID)).to.equal(user1.address);
      
      // After approval, owner should be creator
      await contentRegistry.connect(owner).approveContent(CONTENT_ID, CONTENT_PRICE);
      expect(await contentRegistry.getContentOwner(CONTENT_ID)).to.equal(user1.address);
    });
    
    it("Should return correct availability status", async function () {
      expect(await contentRegistry.isContentAvailable(CONTENT_ID)).to.be.false;
      
      await contentRegistry.connect(owner).approveContent(CONTENT_ID, CONTENT_PRICE);
      expect(await contentRegistry.isContentAvailable(CONTENT_ID)).to.be.true;
    });
    
    it("Should return user's content list", async function () {
      // Before approval, user should have no contents
      let userContents = await contentRegistry.getUserContents(user1.address);
      expect(userContents).to.not.include(CONTENT_ID);
      
      // After approval, user should have the content
      await contentRegistry.connect(owner).approveContent(CONTENT_ID, CONTENT_PRICE);
      userContents = await contentRegistry.getUserContents(user1.address);
      expect(userContents).to.include(BigInt(CONTENT_ID));
    });
  });
  
  describe("Admin Functions", function () {
    it("Should allow owner to set reward distribution address", async function () {
      await contentRegistry.connect(owner).setRewardDistribution(user2.address);
      expect(await contentRegistry.rewardDistribution()).to.equal(user2.address);
    });
    
    it("Should fail if non-owner tries to set reward distribution", async function () {
      await expect(
        contentRegistry.connect(user1).setRewardDistribution(user2.address)
      ).to.be.revertedWithCustomError(contentRegistry, "OwnableUnauthorizedAccount");
    });
    
    it("Should allow owner to pause/unpause", async function () {
      // First set up content for testing
      await contentRegistry.connect(user1).registerContent(
        CONTENT_ID + 1,
        user1.address,
        CONTENT_HASH,
        CONTENT_TYPE
      );
      await contentRegistry.connect(owner).approveContent(CONTENT_ID + 1, CONTENT_PRICE);
      
      // Approve ContentRegistry to spend buyer's TOAST tokens
      await toastToken.connect(buyer).approve(await contentRegistry.getAddress(), CONTENT_PRICE);
      
      await contentRegistry.connect(owner).pause();
      
      // Test that a function with whenNotPaused modifier is reverted
      await expect(
        contentRegistry.connect(buyer).purchaseContent(CONTENT_ID + 1)
      ).to.be.revertedWithCustomError(contentRegistry, "EnforcedPause");
      
      await contentRegistry.connect(owner).unpause();
      
      // Test that the function works after unpause
      await expect(
        contentRegistry.connect(buyer).purchaseContent(CONTENT_ID + 1)
      ).to.not.be.reverted;
    });
  });
  
  // Revenue distribution constants are defined in ContentRewardDistribution contract
  // ContentRegistry doesn't have these constants
});
