// SPDX-License-Identifier: BUSL
// Teahouse Finance

pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract RewardBook is Ownable {

    using SafeERC20 for IERC20;
    using ECDSA for bytes32;

    error InvalidToken();
    error InvalidAddress();
    error InvalidTotalReward();
    error InvalidArrayLengths();
    error InvalidSignature();

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
    function sendRewardEth(address payable _target, uint256 _totalReward) external onlyOwner returns (uint256 amount) {
        return _internalSendRewardEth(_target, _totalReward);
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
            amounts[i] = _internalSendRewardEth(_targets[i], _totalRewards[i]);
        }
    }

    /// @notice Claim ethereum reward
    /// @param _target Address to send ethereum reward to
    /// @param _totalReward Total amount of ethereum reward for this address
    /// @param _signature Signature signed by owner of abi.encodePacked(_target, _totalReward)
    /// @return amount Amount of ethereum sent to this address
    /// @notice This contract maintains the amount of ethereum already sent to this address and send only the additional amount.
    function claimRewardEth(address payable _target, uint256 _totalReward, bytes calldata _signature) external returns (uint256 amount) {
        bytes32 ethHashMessage = ECDSA.toEthSignedMessageHash(abi.encodePacked(_target, _totalReward));
        if (ethHashMessage.recover(_signature) != owner()) revert InvalidSignature();

        return _internalSendRewardEth(_target, _totalReward);
    }

    /// @notice Internal function for sending ethereum reward
    /// @param _target Address to send ethereum reward to
    /// @param _totalReward Total amount of ethereum reward for this address
    /// @return amount Amount of ethereum sent to this address
    /// @notice This contract maintains the amount of ethereum already sent to this address and send only the additional amount.
    function _internalSendRewardEth(address payable _target, uint256 _totalReward) internal returns (uint256 amount) {
        if (_target == address(0)) revert InvalidAddress();
        if (_totalReward < rewardsSentEth[_target]) revert InvalidTotalReward();

        amount = _totalReward - rewardsSentEth[_target];
        if (amount > 0) {
            rewardsSentEth[_target] = _totalReward;
            Address.sendValue(_target, amount);
            emit RewardSentEth(msg.sender, _target, _totalReward, amount);
        }        
    }

    /// @notice Send ERC20 token reward
    /// @param _token Address of the ERC20 token
    /// @param _target Address to send token reward to
    /// @param _totalReward Total amount of token reward for this address
    /// @return amount Amount of token sent to this address
    /// @notice This contract maintains the amount of tokens already sent to this address and send only the additional amount.
    /// @notice If _token is NATIVE_ADDRESS, it calls sendRewardEth.
    function sendRewardERC20(address _token, address _target, uint256 _totalReward) external onlyOwner returns (uint256 amount) {
        return _internalSendRewardERC20(_token, _target, _totalReward);
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
            amounts[i] = _internalSendRewardERC20(_tokens[i], _targets[i], _totalRewards[i]);
        }
    }

    /// @notice Claim ERC20 token reward
    /// @param _token Address of the ERC20 token    
    /// @param _target Address to send ethereum reward to
    /// @param _totalReward Total amount of ethereum reward for this address
    /// @param _signature Signature signed by owner of abi.encodePacked(_token, _target, _totalReward)
    /// @return amount Amount of ethereum sent to this address
    /// @notice This contract maintains the amount of ethereum already sent to this address and send only the additional amount.
    function claimRewardERC20(address _token, address _target, uint256 _totalReward, bytes calldata _signature) external returns (uint256 amount) {
        bytes32 ethHashMessage = ECDSA.toEthSignedMessageHash(abi.encodePacked(_token, _target, _totalReward));
        if (ethHashMessage.recover(_signature) != owner()) revert InvalidSignature();

        return _internalSendRewardERC20(_token, _target, _totalReward);
    }

    /// @notice Internal function for sending ERC20 token reward
    /// @param _token Address of the ERC20 token
    /// @param _target Address to send token reward to
    /// @param _totalReward Total amount of token reward for this address
    /// @return amount Amount of token sent to this address
    /// @notice This contract maintains the amount of tokens already sent to this address and send only the additional amount.
    /// @notice If _token is NATIVE_ADDRESS, it calls _internalSendRewardERC20.
    function _internalSendRewardERC20(address _token, address _target, uint256 _totalReward) internal returns (uint256 amount) {
        if (_token == NATIVE_ADDRESS) {
            return _internalSendRewardEth(payable(_target), _totalReward);
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
