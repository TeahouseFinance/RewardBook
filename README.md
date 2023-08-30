# RewardBook contract

RewardBook is a simple contract for helping centralized distribution of ERC20 reward tokens.

This contract records the amount of tokens already send to the recipient, so the distributor only has to maintain the total amount of tokens for the recipients. No need to worry about how much were already sent.

## Installation

Use `npm install` to install required packages.

## Configuration

Copy `.env.example` to `.env` and change relevant settings.

## Test

Use `npx hardhat test` to run unit tests.

## Deployment

Use `npx hardhat compile` to compile contract codes.

See `deploy.ts` in `scripts` folder for an example deployment script.
