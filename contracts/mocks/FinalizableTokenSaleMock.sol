pragma solidity ^0.4.17;

import '../crowdsale/FinalizableCrowdsale.sol';
import '../token/MintableToken.sol';

contract FinalizableCrowdsaleMock is FinalizableCrowdsale {

  function FinalizableCrowdsaleMock(uint256 _startTime, uint256 _endTime, uint256 _rate,
    address _wallet, address _token)
    Crowdsale(_startTime, _endTime, _rate, _wallet, _token)
    public{
  }

  function finalization() internal {
    token.finishMinting();

    super.finalization();
  }
}
