pragma solidity ^0.4.17;

import '../crowdsale/TokenCappedCrowdsale.sol';
import '../token/MintableToken.sol';

contract TokenCappedCrowdsaleMock is TokenCappedCrowdsale {

  function TokenCappedCrowdsaleMock(uint256 _tokenCap,
    uint256 _startTime, uint256 _endTime, uint256 _rate,
    address _wallet, address _token)
    TokenCappedCrowdsale(_tokenCap)
    Crowdsale(_startTime, _endTime, _rate, _wallet, _token)
    public{
    }
}
