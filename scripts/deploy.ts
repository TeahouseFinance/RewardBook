import { ethers } from "hardhat";

async function main() {
    const [owner] = await ethers.getSigners();
    const rewardBook = await ethers.deployContract("RewardBook", [owner.address]);
    await rewardBook.waitForDeployment();

    console.log(`RewardBook deployed to ${rewardBook.target}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
