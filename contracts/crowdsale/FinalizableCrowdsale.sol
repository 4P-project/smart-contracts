pragma solidity ^0.4.17;

import '../helpers/SafeMath.sol';
import '../helpers/Ownable.sol';

import "./Crowdsale.sol";


contract FinalizableCrowdsale is Crowdsale, Ownable {
  using SafeMath for uint256;

  event Finalized();

  bool public isFinalized = false;

  /**
   * @dev Must be called after crowdsale ends, to do some extra finalization
   * work. Calls the contract's finalization function.
   */
  function finalize() onlyOwner public {
    require(!isFinalized);
    require(hasEnded());

    finalization();
    Finalized();

    isFinalized = true;
  }

  /**
   * @dev Can be overridden to add finalization logic. The overriding function
   * should call super.finalization() to ensure the chain of finalization is
   * executed entirely.
   */
  function finalization() internal {
  }

}
