pragma solidity ^0.4.17;

import './crowdsale/TokenCappedCrowdsale.sol';
import './crowdsale/WhitelistCrowdsale.sol';
import './crowdsale/FinalizableCrowdsale.sol';
import './token/ERC20Interface.sol';
import './FourToken.sol';


contract FourCrowdsale is TokenCappedCrowdsale, WhitelistCrowdsale, FinalizableCrowdsale {
  event RateChanged(uint256 newRate, string name);

  uint256 private constant E18 = 10**18;

  // Max tokens sold = 152 million
  uint256 private TOKEN_SALE_CAP = 152000000 * E18;

  uint256 public constant TEAM_TOKENS = 50000000 * E18;
  address public constant TEAM_ADDRESS = 0x3EC2fC20c04656F4B0AA7372258A36FAfB1EF427;

  uint256 public constant VAULT_TOKENS = 152000000 * E18;
  address public constant VAULT_ADDRESS = 0x545baa8e4Fff675711CB92Af33e5850aDD913b76;

  uint256 public constant ADVISORS_AND_CONTRIBUTORS_TOKENS = 39000000 * E18;
  address public constant ADVISORS_AND_CONTRIBUTORS_ADDRESS = 0x90adab6891514DC24411B9Adf2e11C0eD7739999;

  uint256 public constant BOUNTY_TOKENS = 7000000 * E18;
  address public constant BOUNTY_ADDRESS = 0x4E045f317B4907320B8b7aC3776C996F59e28790;

  // To be airdroped to crowdsale participants and early backers 
  address public constant UNSOLD_ADDRESS = 0x4ec155995211c8639375ae3106187bff3ff5db46;

  uint256 public earlyRate;
  uint256 public presaleRate;

  function FourCrowdsale(uint256 _startTime,
                         uint256 _endTime,
                         uint256 _rate,
                         address _wallet,
                         address _token,
                         uint256 _earlyRate,
                         uint256 _presaleRate)
        TokenCappedCrowdsale(TOKEN_SALE_CAP)
        Crowdsale(_startTime, _endTime, _rate, _wallet, _token) public {
    earlyRate = _earlyRate;
    presaleRate = _presaleRate;
  }

  function setCrowdsaleWallet(address _wallet) public onlyOwner {
    require(_wallet != address(0));
    wallet = _wallet;
  }

  function setRate(uint256 _rate) public onlyOwner  {
    require(now < startTime); // cant change once the sale has started
    rate = _rate;
    RateChanged(_rate, 'crowdsale');
  }

  function setEarlyRate(uint256 _earlyRate) public onlyOwner  {
    require(now < startTime); // cant change once the sale has started
    earlyRate = _earlyRate;
    RateChanged(_earlyRate, 'early');
  }

  function setPresaleRate(uint256 _presaleRate) public onlyOwner  {
    require(now < startTime); // cant change once the sale has started
    presaleRate = _presaleRate;
    RateChanged(_presaleRate, 'presale');
  }

  function validatePresaleOrEarly(address[] _beneficiaries, uint256[] _weiAmounts, uint256 _presaleOrEarlyRate) internal view returns(bool) {
    require(_beneficiaries.length == _weiAmounts.length);
    require(hasEnded() == false);

    uint256 totalAmount = 0;

    for (uint i = 0; i < _weiAmounts.length; i++) {
      totalAmount += _weiAmounts[i];
      require(_beneficiaries[i] != address(0));
    }

    // make sure that sum of weiAmounts is same as Ether sent to the contract
    require(totalAmount == msg.value);
    uint256 tokens = totalAmount.mul(_presaleOrEarlyRate);

    return tokensSold.add(tokens) <= tokenCap;
  }

  function processPresaleContributors(address[] _beneficiaries, uint256[] _weiAmounts) public onlyOwner payable {
    require(validatePresaleOrEarly(_beneficiaries, _weiAmounts, presaleRate));

    for (uint i = 0; i < _beneficiaries.length; i++) {
      processPresaleOrEarlyContributor(_beneficiaries[i], _weiAmounts[i], presaleRate);
    }

    forwardFunds();
  }

  function processEarlyContributors(address[] _beneficiaries, uint256[] _weiAmounts) public onlyOwner payable {
    require(validatePresaleOrEarly(_beneficiaries, _weiAmounts, earlyRate));

    for (uint i = 0; i < _beneficiaries.length; i++) {
      processPresaleOrEarlyContributor(_beneficiaries[i], _weiAmounts[i], earlyRate);
    }

    forwardFunds();
  }

  function processPresaleOrEarlyContributor(address _beneficiary, uint256 _weiAmount, uint256 _presaleOrEarlyRate) internal {
    uint256 tokens = _weiAmount.mul(_presaleOrEarlyRate);
    // update state
    weiRaised = weiRaised.add(_weiAmount);
    tokensSold = tokensSold.add(tokens);

    token.mint(_beneficiary, tokens);
    TokenPurchase(msg.sender, _beneficiary, _weiAmount, tokens);
  }


  function finalization() internal {
    // transfer tokens to team
    token.mint(TEAM_ADDRESS, TEAM_TOKENS);
    // transfer tokens to the 4th pillar vault
    token.mint(VAULT_ADDRESS, VAULT_TOKENS);

    // transfer advisors and contributors tokens
    token.mint(ADVISORS_AND_CONTRIBUTORS_ADDRESS, ADVISORS_AND_CONTRIBUTORS_TOKENS);

    // transfer bounty tokens
    token.mint(BOUNTY_ADDRESS, BOUNTY_TOKENS);

    // transfer all unsold tokens to the unsold address for the airdrop
    uint256 unsold_tokens = TOKEN_SALE_CAP - tokensSold;
    token.mint(UNSOLD_ADDRESS, unsold_tokens);

    // finish minting
    token.finishMinting();
    // release ownership back to owner
    token.transferOwnership(owner);
    // finalize
    super.finalization();
  }

  // @dev Recover any mistakenly sent ERC20 tokens to the Crowdsale address
  function recoverERC20Tokens(address _erc20, uint256 _amount) public onlyOwner {
    ERC20Interface(_erc20).transfer(msg.sender, _amount);
  }

  function releaseTokenOwnership() public onlyOwner {
    token.transferOwnership(owner);
  }
}
