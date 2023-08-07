pragma solidity ^0.4.17;

import '../helpers/Pausable.sol';


contract PausableMock is Pausable {
  bool public somethingHappened = false;
  uint256 public counter = 0;


  function somePausableFunction() public whenNotPaused {
    counter++;
  }

  function onlyWhenPaused() public whenPaused {
    somethingHappened = true;
  }

}
