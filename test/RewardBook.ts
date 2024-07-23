import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

const ZeroAddress = '0x' + '0'.repeat(40);

describe("RewardBook", function () {
    // We define a fixture to reuse the same setup in every test.
    // We use loadFixture to run this setup once, snapshot that state,
    // and reset Hardhat Network to that snapshot in every test.
    async function deployLockFixture() { 
        // Contracts are deployed using the first signer/account by default
        const [owner, otherAccount, otherAccount2 ] = await ethers.getSigners();
  
        const Token = await ethers.getContractFactory("MockToken");
        const token = await Token.deploy(ethers.parseEther("100000"));

        const RewardBook = await ethers.getContractFactory("RewardBook");
        const rewardBook = await RewardBook.deploy(owner);

        const amount = ethers.parseEther("10");
        await owner.sendTransaction({
            to: rewardBook,
            value: amount,
        });

        await token.transfer(rewardBook, amount);
  
        return { rewardBook, owner, token, otherAccount, otherAccount2 };
    }

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            const { rewardBook, owner } = await loadFixture(deployLockFixture);

            expect(await rewardBook.owner()).to.equal(owner.address);
        });

        it("Should accept ethereum", async function () {
            const { rewardBook, otherAccount } = await loadFixture(deployLockFixture);

            // already sent ethereum in the deploy function

            const amount = ethers.parseEther("10");
            expect(await ethers.provider.getBalance(rewardBook)).to.equal(amount);
        });
    });

    describe("Ethereum functions", function () {
        it("Should be able to send ethereum reward from owner", async function () {
            const { rewardBook, owner, otherAccount } = await loadFixture(deployLockFixture);

            const reward = ethers.parseEther("1");
            expect(await rewardBook.sendRewardEth(otherAccount, reward))
            .to.emit(rewardBook, "RewardSentEth")
            .withArgs(owner, otherAccount, reward, reward)
            .changeEtherBalance(otherAccount, reward);

            expect(await rewardBook.rewardsSentEth(otherAccount)).to.equal(reward);
        });

        it("Should be able to send ethereum reward for multiple times from owner", async function () {
            const { rewardBook, owner, otherAccount } = await loadFixture(deployLockFixture);

            const reward = ethers.parseEther("1");
            await rewardBook.sendRewardEth(otherAccount, reward);

            const reward2 = ethers.parseEther("1.5");
            const diff = reward2 - reward;
            expect(await rewardBook.sendRewardEth(otherAccount, reward2))
            .to.emit(rewardBook, "RewardSentEth")
            .withArgs(owner, otherAccount, reward2, diff)
            .changeEtherBalance(otherAccount, diff);

            expect(await rewardBook.rewardsSentEth(otherAccount)).to.equal(reward2);
        });

        it("Should not be able to send ethereum reward to zero address", async function () {
            const { rewardBook, owner } = await loadFixture(deployLockFixture);

            const reward = ethers.parseEther("1");
            await expect(rewardBook.sendRewardEth(ZeroAddress, reward))
            .to.be.revertedWithCustomError(rewardBook, "InvalidAddress");
        });

        it("Should not be able to send ethereum reward with total rewards less than current total rewards", async function () {
            const { rewardBook, owner, otherAccount } = await loadFixture(deployLockFixture);

            const reward = ethers.parseEther("1");
            await rewardBook.sendRewardEth(otherAccount, reward);

            const reward2 = ethers.parseEther("0.5");
            await expect(rewardBook.sendRewardEth(otherAccount, reward2))
            .to.be.revertedWithCustomError(rewardBook, "InvalidTotalReward");
        });         

        it("Should not be able to send ethereum reward from non-owner", async function () {
            const { rewardBook, owner, otherAccount } = await loadFixture(deployLockFixture);

            const reward = ethers.parseEther("1");
            await expect(rewardBook.connect(otherAccount).sendRewardEth(otherAccount, reward))
            .to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should be able to send multiple ethereum rewards from owner", async function () {
            const { rewardBook, owner, otherAccount, otherAccount2 } = await loadFixture(deployLockFixture);

            const reward1 = ethers.parseEther("1");
            const reward2 = ethers.parseEther("2");
            expect(await rewardBook.sendRewardsEth([otherAccount, otherAccount2], [reward1, reward2]))
            .changeEtherBalances([otherAccount, otherAccount2], [reward1, reward2]);

            expect(await rewardBook.rewardsSentEth(otherAccount.address)).to.equal(reward1);
            expect(await rewardBook.rewardsSentEth(otherAccount2.address)).to.equal(reward2);
        });

        it("Should not be able to send multiple ethereum rewards to zero address", async function () {
            const { rewardBook, owner, otherAccount } = await loadFixture(deployLockFixture);

            const reward1 = ethers.parseEther("1");
            const reward2 = ethers.parseEther("2");
            await expect(rewardBook.sendRewardsEth([otherAccount, ZeroAddress], [reward1, reward2]))
            .to.be.revertedWithCustomError(rewardBook, "InvalidAddress");
        });        

        it("Should not be able to send multiple ethereum rewards from non-owner", async function () {
            const { rewardBook, owner, otherAccount, otherAccount2 } = await loadFixture(deployLockFixture);

            const reward1 = ethers.parseEther("1");
            const reward2 = ethers.parseEther("2");
            await expect(rewardBook.connect(otherAccount).sendRewardsEth([otherAccount, otherAccount2], [reward1, reward2]))
            .to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should not be able to send multiple ethereum rewards with incorrect total rewards", async function () {
            const { rewardBook, owner, otherAccount, otherAccount2 } = await loadFixture(deployLockFixture);

            const reward = ethers.parseEther("1");
            await rewardBook.sendRewardEth(otherAccount, reward);

            const reward1 = ethers.parseEther("0.5");
            const reward2 = ethers.parseEther("2");
            await expect(rewardBook.sendRewardsEth([otherAccount, otherAccount2], [reward1, reward2]))
            .to.be.revertedWithCustomError(rewardBook, "InvalidTotalReward");
        });

        it("Should be able to claim ethereum reward with signature from owner", async function () {
            const { rewardBook, owner, otherAccount } = await loadFixture(deployLockFixture);

            const reward = ethers.parseEther("1");
            const message = ethers.solidityPacked(["address", "uint256"], [otherAccount.address, reward]);
            const signature = await owner.signMessage(ethers.toBeArray(message));
            expect(await rewardBook.connect(otherAccount).claimRewardEth(otherAccount, reward, signature))
            .to.emit(rewardBook, "RewardSentEth")
            .withArgs(owner, otherAccount, reward, reward)
            .changeEtherBalance(otherAccount, reward);

            expect(await rewardBook.rewardsSentEth(otherAccount)).to.equal(reward);
        });

        it("Should not be able to claim ethereum reward with signature from non-owner", async function () {
            const { rewardBook, otherAccount } = await loadFixture(deployLockFixture);

            const reward = ethers.parseEther("1");
            const message = ethers.solidityPacked(["address", "uint256"], [otherAccount.address, reward]);
            const signature = await otherAccount.signMessage(ethers.toBeArray(message));
            await expect(rewardBook.connect(otherAccount).claimRewardEth(otherAccount, reward, signature))
            .to.be.revertedWithCustomError(rewardBook, "InvalidSignature");
        });

        it("Should not be able to claim ethereum reward with invalid signature", async function () {
            const { rewardBook, owner, otherAccount } = await loadFixture(deployLockFixture);

            const reward = ethers.parseEther("1");
            const message = ethers.solidityPacked(["address", "uint256"], [otherAccount.address, reward]);
            const signature = await owner.signMessage(ethers.toBeArray(message));
            const changedSignature = signature.slice(0, -2) + "00";
            await expect(rewardBook.connect(otherAccount).claimRewardEth(otherAccount, reward, changedSignature))
            .to.be.revertedWith("ECDSA: invalid signature");
        });

        it("Should not be able to claim ethereum reward with signature consistent with parameters", async function () {
            const { rewardBook, owner, otherAccount } = await loadFixture(deployLockFixture);

            const reward = ethers.parseEther("1");
            const reward2 = ethers.parseEther("2");
            const message = ethers.solidityPacked(["address", "uint256"], [otherAccount.address, reward]);
            const signature = await owner.signMessage(ethers.toBeArray(message));
            await expect(rewardBook.connect(otherAccount).claimRewardEth(otherAccount, reward2, signature))
            .to.be.revertedWithCustomError(rewardBook, "InvalidSignature");
        });        

        it("Should be able to collect ethereum from owner", async function () {
            const { rewardBook, owner } = await loadFixture(deployLockFixture);

            const amount = ethers.parseEther("10");
            expect(await rewardBook.collectEth(owner, amount))
            .changeEtherBalance(owner, amount);
        });

        it("Should not be able to collect ethereum to zero address", async function () {
            const { rewardBook, owner } = await loadFixture(deployLockFixture);

            const amount = ethers.parseEther("10");
            await expect(rewardBook.collectEth(ZeroAddress, amount))
            .to.be.revertedWithCustomError(rewardBook, "InvalidAddress")
        });        

        it("Should not be able to collect ethereum from non-owner", async function () {
            const { rewardBook, owner, otherAccount } = await loadFixture(deployLockFixture);

            const amount = ethers.parseEther("10");
            await expect(rewardBook.connect(otherAccount).collectEth(owner, amount))
            .to.be.revertedWith("Ownable: caller is not the owner");
        });        
    });

    describe("ERC20 functions", function () {
        it("Should be able to send token reward from owner", async function () {
            const { rewardBook, token, owner, otherAccount } = await loadFixture(deployLockFixture);

            const reward = ethers.parseEther("1");
            expect(await rewardBook.sendRewardERC20(token, otherAccount, reward))
            .to.emit(rewardBook, "RewardSentERC20")
            .withArgs(owner, otherAccount, reward, reward)
            .changeTokenBalance(token, otherAccount, reward);

            expect(await rewardBook.rewardsSentERC20(token, otherAccount)).to.equal(reward);
        });

        it("Should be able to send ethereum reward using ERC20 function from owner", async function () {
            const { rewardBook, owner, otherAccount } = await loadFixture(deployLockFixture);

            const nativeAddress = await rewardBook.NATIVE_ADDRESS();
            const reward = ethers.parseEther("1");
            expect(await rewardBook.sendRewardERC20(nativeAddress, otherAccount, reward))
            .to.emit(rewardBook, "RewardSentEth")
            .withArgs(owner, otherAccount, reward, reward)
            .changeEtherBalance(otherAccount, reward);

            expect(await rewardBook.rewardsSentEth(otherAccount)).to.equal(reward);
        });

        it("Should be able to send token reward for multiple times from owner", async function () {
            const { rewardBook, token, owner, otherAccount } = await loadFixture(deployLockFixture);

            const reward = ethers.parseEther("1");
            await rewardBook.sendRewardERC20(token, otherAccount, reward);

            const reward2 = ethers.parseEther("1.5");
            const diff = reward2 - reward;
            expect(await rewardBook.sendRewardERC20(token, otherAccount, reward2))
            .to.emit(rewardBook, "RewardSentERC20")
            .withArgs(owner, otherAccount, reward2, diff)
            .changeTokenBalance(token, otherAccount, diff);

            expect(await rewardBook.rewardsSentERC20(token, otherAccount)).to.equal(reward2);
        });

        it("Should not be able to send token reward to zero address", async function () {
            const { rewardBook, token } = await loadFixture(deployLockFixture);

            const reward = ethers.parseEther("1");
            await expect(rewardBook.sendRewardERC20(token, ZeroAddress, reward))
            .to.be.revertedWithCustomError(rewardBook, "InvalidAddress");
        });

        it("Should not be able to send token reward with total rewards less than current total rewards", async function () {
            const { rewardBook, token, otherAccount } = await loadFixture(deployLockFixture);

            const reward = ethers.parseEther("1");
            await rewardBook.sendRewardERC20(token, otherAccount, reward);

            const reward2 = ethers.parseEther("0.5");
            await expect(rewardBook.sendRewardERC20(token, otherAccount, reward2))
            .to.be.revertedWithCustomError(rewardBook, "InvalidTotalReward");
        });         

        it("Should not be able to send token reward from non-owner", async function () {
            const { rewardBook, token, otherAccount } = await loadFixture(deployLockFixture);

            const reward = ethers.parseEther("1");
            await expect(rewardBook.connect(otherAccount).sendRewardERC20(token, otherAccount, reward))
            .to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should be able to send multiple token rewards from owner", async function () {
            const { rewardBook, token, otherAccount, otherAccount2 } = await loadFixture(deployLockFixture);

            const reward1 = ethers.parseEther("1");
            const reward2 = ethers.parseEther("2");
            expect(await rewardBook.sendRewardsERC20([token, token], [otherAccount, otherAccount2], [reward1, reward2]))
            .changeTokenBalances(token, [otherAccount, otherAccount2], [reward1, reward2]);

            expect(await rewardBook.rewardsSentERC20(token, otherAccount)).to.equal(reward1);
            expect(await rewardBook.rewardsSentERC20(token, otherAccount2)).to.equal(reward2);
        });

        it("Should not be able to send multiple token rewards to zero address", async function () {
            const { rewardBook, token, otherAccount } = await loadFixture(deployLockFixture);

            const reward1 = ethers.parseEther("1");
            const reward2 = ethers.parseEther("2");
            await expect(rewardBook.sendRewardsERC20([token, token], [otherAccount, ZeroAddress], [reward1, reward2]))
            .to.be.revertedWithCustomError(rewardBook, "InvalidAddress");
        });

        it("Should not be able to send multiple token rewards from non-owner", async function () {
            const { rewardBook, token, otherAccount, otherAccount2 } = await loadFixture(deployLockFixture);

            const reward1 = ethers.parseEther("1");
            const reward2 = ethers.parseEther("2");
            await expect(rewardBook.connect(otherAccount).sendRewardsERC20([token, token], [otherAccount, otherAccount2], [reward1, reward2]))
            .to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should not be able to send multiple token rewards with incorrect total rewards", async function () {
            const { rewardBook, token, otherAccount, otherAccount2 } = await loadFixture(deployLockFixture);

            const reward = ethers.parseEther("1");
            await rewardBook.sendRewardERC20(token, otherAccount, reward);

            const reward1 = ethers.parseEther("0.5");
            const reward2 = ethers.parseEther("2");
            await expect(rewardBook.sendRewardsERC20([token, token], [otherAccount, otherAccount2], [reward1, reward2]))
            .to.be.revertedWithCustomError(rewardBook, "InvalidTotalReward");
        });

        it("Should be able to claim token reward with signature from owner", async function () {
            const { rewardBook, token, owner, otherAccount } = await loadFixture(deployLockFixture);

            const reward = ethers.parseEther("1");
            const message = ethers.solidityPacked(["address", "address", "uint256"], [token.target, otherAccount.address, reward]);
            const signature = await owner.signMessage(ethers.toBeArray(message));
            expect(await rewardBook.connect(otherAccount).claimRewardERC20(token, otherAccount, reward, signature))
            .to.emit(rewardBook, "RewardSentERC20")
            .withArgs(owner, otherAccount, reward, reward)
            .changeTokenBalance(token, otherAccount, reward);

            expect(await rewardBook.rewardsSentERC20(token, otherAccount)).to.equal(reward);
        });

        it("Should not be able to claim ethereum reward with signature from non-owner", async function () {
            const { rewardBook, token, otherAccount } = await loadFixture(deployLockFixture);

            const reward = ethers.parseEther("1");
            const message = ethers.solidityPacked(["address", "address", "uint256"], [token.target, otherAccount.address, reward]);
            const signature = await otherAccount.signMessage(ethers.toBeArray(message));
            await expect(rewardBook.connect(otherAccount).claimRewardERC20(token, otherAccount, reward, signature))
            .to.be.revertedWithCustomError(rewardBook, "InvalidSignature");
        });

        it("Should not be able to claim ethereum reward with invalid signature", async function () {
            const { rewardBook, token, owner, otherAccount } = await loadFixture(deployLockFixture);

            const reward = ethers.parseEther("1");
            const message = ethers.solidityPacked(["address", "address", "uint256"], [token.target, otherAccount.address, reward]);
            const signature = await owner.signMessage(ethers.toBeArray(message));
            const changedSignature = signature.slice(0, -2) + "00";
            await expect(rewardBook.connect(otherAccount).claimRewardERC20(token, otherAccount, reward, changedSignature))
            .to.be.revertedWith("ECDSA: invalid signature");
        });

        it("Should not be able to claim ethereum reward with signature consistent with parameters", async function () {
            const { rewardBook, token, owner, otherAccount } = await loadFixture(deployLockFixture);

            const reward = ethers.parseEther("1");
            const reward2 = ethers.parseEther("2");
            const message = ethers.solidityPacked(["address", "address", "uint256"], [token.target, otherAccount.address, reward]);
            const signature = await owner.signMessage(ethers.toBeArray(message));
            await expect(rewardBook.connect(otherAccount).claimRewardERC20(token, otherAccount, reward2, signature))
            .to.be.revertedWithCustomError(rewardBook, "InvalidSignature");
        });

        it("Should be able to collect token from owner", async function () {
            const { rewardBook, token, owner } = await loadFixture(deployLockFixture);

            const amount = ethers.parseEther("10");
            expect(await rewardBook.collectERC20(token, owner, amount))
            .changeTokenBalance(token, owner, amount);
        });

        it("Should not be able to collect token to zero address", async function () {
            const { rewardBook, token } = await loadFixture(deployLockFixture);

            const amount = ethers.parseEther("10");
            await expect(rewardBook.collectERC20(token, ZeroAddress, amount))
            .to.be.revertedWithCustomError(rewardBook, "InvalidAddress")
        });        

        it("Should not be able to collect token from non-owner", async function () {
            const { rewardBook, token, owner, otherAccount } = await loadFixture(deployLockFixture);

            const amount = ethers.parseEther("10");
            await expect(rewardBook.connect(otherAccount).collectERC20(token, owner, amount))
            .to.be.revertedWith("Ownable: caller is not the owner");
        });
    });
});
