pragma solidity ^0.4.17;

import './token/CappedToken.sol';
import './token/PausableSignedTransferToken.sol';
import './token/ERC20Interface.sol';

contract FourToken is CappedToken, PausableSignedTransferToken  {
  string public name = 'The 4th Pillar Token';
  string public symbol = 'FOUR';
  uint256 public decimals = 18;

  // Max supply of 400 million
  uint256 public maxSupply = 400000000 * 10**decimals;

  function FourToken()
    CappedToken(maxSupply) public {
      paused = true;
  }

  // @dev Recover any mistakenly sent ERC20 tokens to the Token address
  function recoverERC20Tokens(address _erc20, uint256 _amount) public onlyOwner {
    ERC20Interface(_erc20).transfer(msg.sender, _amount);
  }

}
