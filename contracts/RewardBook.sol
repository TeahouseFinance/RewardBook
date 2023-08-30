// SPDX-License-Identifier: BUSL
// Teahouse Finance

pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract RewardBook is Ownable {

    using SafeERC20 for IERC20;

    error InvalidToken();
    error InvalidAddress();
    error InvalidTotalReward();
    error InvalidArrayLengths();

    event RewardSentEth(address caller, address target, uint256 totalReward, uint256 amountSent);
    event RewardSentERC20(address caller, address token, address target, uint256 totalReward, uint256 amountSent);

    address public immutable NATIVE_ADDRESS = address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);

    mapping(address => uint256) public rewardsSentEth;
    mapping(address => mapping(address => uint256)) public rewardsSentERC20;

    constructor(address _owner) {
        if (_owner == address(0)) revert InvalidAddress();
        Ownable.transferOwnership(_owner);
    }

    receive() payable external {
        // do nothing
    }

    /// @notice Send ethereum reward
    /// @param _target Address to send ethereum reward to
    /// @param _totalReward Total amount of ethereum reward for this address
    /// @return amount Amount of ethereum sent to this address
    /// @notice This contract maintains the amount of ethereum already sent to this address and send only the additional amount.
    function sendRewardEth(address payable _target, uint256 _totalReward) public onlyOwner returns (uint256 amount) {
        if (_target == address(0)) revert InvalidAddress();
        if (_totalReward < rewardsSentEth[_target]) revert InvalidTotalReward();

        amount = _totalReward - rewardsSentEth[_target];
        if (amount > 0) {
            rewardsSentEth[_target] = _totalReward;
            Address.sendValue(_target, amount);
            emit RewardSentEth(msg.sender, _target, _totalReward, amount);
        }
    }

    /// @notice Send ethereum rewards to multiple addresses
    /// @param _targets Addresses to send ethereum rewards to
    /// @param _totalRewards Total amounts of ethereum rewards for these addresses
    /// @return amounts Amounts of ethereum sent to these addresses
    function sendRewardsEth(address payable[] calldata _targets, uint256[] calldata _totalRewards) external onlyOwner returns (uint256[] memory amounts) {
        if (_targets.length != _totalRewards.length) revert InvalidArrayLengths();
        
        uint256 length = _targets.length;
        amounts = new uint256[](_targets.length);
        for (uint256 i = 0; i < length; i++) {
            amounts[i] = sendRewardEth(_targets[i], _totalRewards[i]);
        }
    }

    /// @notice Send ERC20 token reward
    /// @param _token Address of the ERC20 token
    /// @param _target Address to send token reward to
    /// @param _totalReward Total amount of token reward for this address
    /// @return amount Amount of token sent to this address
    /// @notice This contract maintains the amount of tokens already sent to this address and send only the additional amount.
    /// @notice If _token is NATIVE_ADDRESS, it calls sendRewardEth.
    function sendRewardERC20(address _token, address _target, uint256 _totalReward) public onlyOwner returns (uint256 amount) {
        if (_token == NATIVE_ADDRESS) {
            return sendRewardEth(payable(_target), _totalReward);
        }

        if (_token == address(0)) revert InvalidToken();
        if (_target == address(0)) revert InvalidAddress();
        if (_totalReward < rewardsSentERC20[_token][_target]) revert InvalidTotalReward();

        amount = _totalReward - rewardsSentERC20[_token][_target];
        if (amount > 0) {
            rewardsSentERC20[_token][_target] = _totalReward;
            IERC20(_token).safeTransfer(_target, amount);
            emit RewardSentERC20(msg.sender, _token, _target, _totalReward, amount);
        }
    }

    /// @notice Send token rewards to multiple addresses
    /// @param _tokens Addresses of ERC20 tokens
    /// @param _targets Addresses to send token rewards to
    /// @param _totalRewards Total amounts of token rewards for these addresses
    /// @return amounts Amounts of tokens sent to these addresses
    function sendRewardsERC20(address[] calldata _tokens, address[] calldata _targets, uint256[] calldata _totalRewards) external onlyOwner returns (uint256[] memory amounts) {
        if (_tokens.length != _targets.length) revert InvalidArrayLengths();
        if (_targets.length != _totalRewards.length) revert InvalidArrayLengths();
        
        uint256 length = _targets.length;
        amounts = new uint256[](_targets.length);
        for (uint256 i = 0; i < length; i++) {
            amounts[i] = sendRewardERC20(_tokens[i], _targets[i], _totalRewards[i]);
        }
    }

    /// @notice Collect ethereum from the contract
    /// @param _recipient Address to send ethereum to
    /// @param _amount Amount of ethereum to collect
    function collectEth(address payable _recipient, uint256 _amount) external onlyOwner {
        if (_recipient == address(0)) revert InvalidAddress();

        if (_amount > 0) {
            Address.sendValue(_recipient, _amount);
        }
    }

    /// @notice Collect ERC20 tokens from the contract
    /// @param _token Address of the ERC20 token
    /// @param _recipient Address to send tokens to
    /// @param _amount Amount of tokens to collect
    function collectERC20(address _token, address _recipient, uint256 _amount) external onlyOwner {
        if (_token == address(0)) revert InvalidToken();
        if (_recipient == address(0)) revert InvalidAddress();

        if (_amount > 0) {
            IERC20(_token).safeTransfer(_recipient, _amount);
        }
    }
}
