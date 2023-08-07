pragma solidity ^0.4.17;

import '../token/SignedTransferToken.sol';


contract SignedTransferTokenMock is SignedTransferToken {

  /**
  * Used for testing purposes. We need to set initial balance so we
  * can perform test of transfer and approve related functions.
  **/
  function SignedTransferTokenMock(address initialAccount, uint256 initialBalance) public {
    balances[initialAccount] = initialBalance;
    totalSupply_ += initialBalance;
  }

}
