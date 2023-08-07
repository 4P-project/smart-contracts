pragma solidity ^0.4.17;

import '../token/BaseToken.sol';


contract BaseTokenMock is BaseToken {

  /**
  * Used for testing purposes. We need to set initial balance so we
  * can perform test of transfer and approve related functions.
  **/
  function BaseTokenMock(address initialAccount, uint256 initialBalance) public {
    balances[initialAccount] = initialBalance;
    totalSupply_ += initialBalance;
  }

}
