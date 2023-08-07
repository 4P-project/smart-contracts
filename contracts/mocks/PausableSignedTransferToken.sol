pragma solidity ^0.4.17;

import '../token/PausableSignedTransferToken.sol';

contract PausableSignedTransferTokenMock is PausableSignedTransferToken {

  /**
  * Used for testing purposes. We need to set initial balance so we
  * can perform test of transfer and approve related functions.
  **/
  function PausableSignedTransferTokenMock(address initialAccount, uint256 initialBalance) public {
    balances[initialAccount] = initialBalance;
    totalSupply_ += initialBalance;
  }

}
