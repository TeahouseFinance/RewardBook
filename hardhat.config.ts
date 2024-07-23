import * as dotenv from "dotenv";

import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

dotenv.config();

const config: HardhatUserConfig = {
    solidity: {
        compilers: [
            {
                version: "0.8.18",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200,
                    },
                },
            },
        ],
    },
    networks: {
        mumbai: {
            url: process.env.MUMBAI_URL || "",
            accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
        },
        boba: {
            url: process.env.BOBA_URL || "",
            accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
        },
        mantle: {
            url: process.env.MANTLE_URL || "",
            accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],            
        },
    },
    etherscan: {
        apiKey: {
            boba: "boba", // apiKey is not required, just set a placeholder
            mantle: "mantle",
        },
        customChains: [
            {
                network: "boba",
                chainId: 288,
                urls: {
                    apiURL: "https://api.routescan.io/v2/network/mainnet/evm/288/etherscan",
                    browserURL: "https://boba.routescan.io",
                },
            },
            {
                network: "mantle",
                chainId: 5000,
                urls: {
                    apiURL: "https://api.routescan.io/v2/network/mainnet/evm/5000/etherscan",
                    browserURL: "https://mantle.routescan.io",
                },
            },
        ],
    },
};

export default config;
