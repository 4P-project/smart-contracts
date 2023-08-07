pragma solidity ^0.4.17;

import '../helpers/SafeMath.sol';
import '../helpers/Ownable.sol';

import "./Crowdsale.sol";


contract WhitelistCrowdsale is Crowdsale, Ownable {
  using SafeMath for uint256;

  event WhitelistUpdated(uint256 timestamp, string operation, uint256 totalAddresses);

  // Mapping of whitelisted addresses
  mapping(address => bool) whitelisted;

  // Total count of whitelisted participants
  uint256 public whitelistedCount;

  function isWhitelisted(address _addr) public view returns (bool) {
    return whitelisted[_addr];
  }

  function addAddress(address _addr) external onlyOwner {
    whitelisted[_addr] = true;
    whitelistedCount++;
    WhitelistUpdated(block.timestamp, "Added", whitelistedCount);
  }

  function addAddresses(address[] _addrs) external onlyOwner {
    for (uint256 i = 0; i < _addrs.length; i++) {
      whitelisted[_addrs[i]] = true;
      whitelistedCount++;
    }

    WhitelistUpdated(block.timestamp, "Added", whitelistedCount);
  }

  function removeAddress(address _addr) external onlyOwner {
    whitelisted[_addr] = false;
    whitelistedCount--;
    WhitelistUpdated(block.timestamp, "Removed", whitelistedCount);
  }

  function removeAddresses(address[] _addrs) external onlyOwner {
    for (uint256 i = 0; i < _addrs.length; i++) {
      whitelisted[_addrs[i]] = false;
      whitelistedCount--;
    }

    WhitelistUpdated(block.timestamp, "Removed", whitelistedCount);
  }

  function validPurchase() internal view returns (bool) {
    return isWhitelisted(msg.sender) && super.validPurchase();
  }

}
