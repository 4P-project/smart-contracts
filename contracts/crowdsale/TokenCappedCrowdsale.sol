pragma solidity ^0.4.17;

import '../helpers/SafeMath.sol';
import "./Crowdsale.sol";


contract TokenCappedCrowdsale is Crowdsale {
  using SafeMath for uint256;

  uint256 public tokenCap;

  function TokenCappedCrowdsale(uint256 _tokenCap) public {
    require(_tokenCap > 0);
    tokenCap = _tokenCap;
  }

  function isCapReached() public view returns (bool) {
    return tokensSold >= tokenCap;
  }

  function hasEnded() public view returns (bool) {
    return isCapReached() || super.hasEnded();
  }

  // overriding Crowdsale#validPurchase to add extra cap logic
  // @return true if investors can buy at the moment
  function validPurchase() internal view returns (bool) {
    bool withinCap = tokensSold.add(getTokenAmount(msg.value)) <= tokenCap;
    return withinCap && super.validPurchase();
  }
}
