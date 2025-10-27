import { expect } from "chai";
import { ethers } from "hardhat";
import { TOASTToken } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("TOASTToken", function () {
  let toastToken: TOASTToken;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let gameDistributor: SignerWithAddress;
  
  const TOTAL_SUPPLY = ethers.parseEther("1000000000"); // 1 billion tokens
  const TRANSFER_AMOUNT = ethers.parseEther("1000000"); // 1M tokens
  const STAKE_AMOUNT = ethers.parseEther("500000"); // 500K tokens
  
  beforeEach(async function () {
    // Get signers
    [owner, user1, user2, gameDistributor] = await ethers.getSigners();
    
    // Deploy contract
    const TOASTTokenFactory = await ethers.getContractFactory("TOASTToken");
    toastToken = await TOASTTokenFactory.deploy(owner.address) as unknown as TOASTToken;
    await toastToken.waitForDeployment();
  });
  
  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      expect(await toastToken.name()).to.equal("TOAST Token");
      expect(await toastToken.symbol()).to.equal("TOAST");
    });
    
    it("Should set the correct total supply", async function () {
      expect(await toastToken.totalSupply()).to.equal(TOTAL_SUPPLY);
    });
    
    it("Should assign total supply to owner", async function () {
      expect(await toastToken.balanceOf(owner.address)).to.equal(TOTAL_SUPPLY);
    });
    
    it("Should set correct decimals", async function () {
      expect(await toastToken.decimals()).to.equal(18);
    });
    
    it("Should set owner as initial game reward distributor", async function () {
      expect(await toastToken.gameRewardDistributors(owner.address)).to.be.true;
    });
  });
  
  describe("Basic Token Operations", function () {
    it("Should transfer tokens correctly", async function () {
      await toastToken.connect(owner).transfer(user1.address, TRANSFER_AMOUNT);
      expect(await toastToken.balanceOf(user1.address)).to.equal(TRANSFER_AMOUNT);
    });
    
    it("Should fail transfer if insufficient balance", async function () {
      await expect(
        toastToken.connect(user1).transfer(user2.address, TRANSFER_AMOUNT)
      ).to.be.revertedWithCustomError(toastToken, "ERC20InsufficientBalance");
    });
    
    it("Should handle allowances correctly", async function () {
      await toastToken.connect(owner).approve(user1.address, TRANSFER_AMOUNT);
      expect(await toastToken.allowance(owner.address, user1.address)).to.equal(TRANSFER_AMOUNT);
      
      await toastToken.connect(user1).transferFrom(owner.address, user2.address, TRANSFER_AMOUNT);
      expect(await toastToken.balanceOf(user2.address)).to.equal(TRANSFER_AMOUNT);
    });
  });
  
  describe("Anti-Whale Protection", function () {
    it("Should reject transfers exceeding maximum limit", async function () {
      const maxTransfer = ethers.parseEther("10000000"); // 10M tokens
      const excessiveAmount = ethers.parseEther("10000001"); // 10M + 1 token
      
      await expect(
        toastToken.connect(owner).transfer(user1.address, excessiveAmount)
      ).to.be.revertedWith("Transfer amount exceeds maximum limit");
    });
    
    it("Should allow transfers at maximum limit", async function () {
      const maxTransfer = ethers.parseEther("10000000"); // 10M tokens
      
      await expect(
        toastToken.connect(owner).transfer(user1.address, maxTransfer)
      ).to.not.be.reverted;
    });
  });
  
  describe("Staking Functionality", function () {
    beforeEach(async function () {
      // Give user1 some tokens to stake
      await toastToken.connect(owner).transfer(user1.address, TRANSFER_AMOUNT);
    });
    
    it("Should allow users to stake tokens", async function () {
      await toastToken.connect(user1).stake(STAKE_AMOUNT);
      
      expect(await toastToken.stakedBalance(user1.address)).to.equal(STAKE_AMOUNT);
      expect(await toastToken.balanceOf(user1.address)).to.equal(TRANSFER_AMOUNT - STAKE_AMOUNT);
    });
    
    it("Should fail staking with insufficient balance", async function () {
      const excessiveStake = TRANSFER_AMOUNT + ethers.parseEther("1");
      
      await expect(
        toastToken.connect(user1).stake(excessiveStake)
      ).to.be.revertedWith("Insufficient balance");
    });
    
    it("Should allow users to unstake tokens", async function () {
      await toastToken.connect(user1).stake(STAKE_AMOUNT);
      await toastToken.connect(user1).unstake(STAKE_AMOUNT);
      
      expect(await toastToken.stakedBalance(user1.address)).to.equal(0);
      expect(await toastToken.balanceOf(user1.address)).to.be.gte(TRANSFER_AMOUNT); // May have rewards
    });
    
    it("Should provide correct staking info", async function () {
      await toastToken.connect(user1).stake(STAKE_AMOUNT);
      
      const stakingInfo = await toastToken.getStakingInfo(user1.address);
      expect(stakingInfo.staked).to.equal(STAKE_AMOUNT);
      expect(stakingInfo.timestamp).to.be.gt(0);
    });
  });
  
  describe("Game Reward Distribution", function () {
    it("Should allow owner to distribute game rewards", async function () {
      const rewardAmount = ethers.parseEther("10000");
      
      await toastToken.connect(owner).distributeGameReward(
        user1.address,
        rewardAmount,
        "Campaign completion"
      );
      
      expect(await toastToken.balanceOf(user1.address)).to.equal(rewardAmount);
    });
    
    it("Should fail if non-distributor tries to distribute rewards", async function () {
      const rewardAmount = ethers.parseEther("10000");
      
      await expect(
        toastToken.connect(user1).distributeGameReward(
          user2.address,
          rewardAmount,
          "Unauthorized attempt"
        )
      ).to.be.revertedWith("Not authorized to distribute game rewards");
    });
    
    it("Should allow owner to add/remove game reward distributors", async function () {
      await toastToken.connect(owner).addGameRewardDistributor(gameDistributor.address);
      expect(await toastToken.gameRewardDistributors(gameDistributor.address)).to.be.true;
      
      await toastToken.connect(owner).removeGameRewardDistributor(gameDistributor.address);
      expect(await toastToken.gameRewardDistributors(gameDistributor.address)).to.be.false;
    });
  });
  
  describe("Pausable Functionality", function () {
    it("Should allow owner to pause and unpause", async function () {
      await toastToken.connect(owner).pause();
      
      await expect(
        toastToken.connect(owner).transfer(user1.address, TRANSFER_AMOUNT)
      ).to.be.revertedWithCustomError(toastToken, "EnforcedPause");
      
      await toastToken.connect(owner).unpause();
      
      await expect(
        toastToken.connect(owner).transfer(user1.address, TRANSFER_AMOUNT)
      ).to.not.be.reverted;
    });
    
    it("Should not allow non-owner to pause", async function () {
      await expect(
        toastToken.connect(user1).pause()
      ).to.be.revertedWithCustomError(toastToken, "OwnableUnauthorizedAccount");
    });
  });
  
  describe("Burnable Functionality", function () {
    beforeEach(async function () {
      await toastToken.connect(owner).transfer(user1.address, TRANSFER_AMOUNT);
    });
    
    it("Should allow users to burn their tokens", async function () {
      const burnAmount = ethers.parseEther("100000");
      const initialBalance = await toastToken.balanceOf(user1.address);
      const initialSupply = await toastToken.totalSupply();
      
      await toastToken.connect(user1).burn(burnAmount);
      
      expect(await toastToken.balanceOf(user1.address)).to.equal(initialBalance - burnAmount);
      expect(await toastToken.totalSupply()).to.equal(initialSupply - burnAmount);
    });
  });
  
  describe("Emergency Functions", function () {
    it("Should allow owner to emergency withdraw ETH", async function () {
      // Send some ETH to contract (simulate accidental transfer)
      await owner.sendTransaction({
        to: await toastToken.getAddress(),
        value: ethers.parseEther("1")
      });
      
      const initialOwnerBalance = await ethers.provider.getBalance(owner.address);
      await toastToken.connect(owner).emergencyWithdrawETH();
      const finalOwnerBalance = await ethers.provider.getBalance(owner.address);
      
      expect(finalOwnerBalance).to.be.gt(initialOwnerBalance);
    });
  });
  
  describe("Version", function () {
    it("Should return correct version", async function () {
      expect(await toastToken.version()).to.equal("1.0.0");
    });
  });
});
