pragma solidity ^0.4.17;


import "./ERC20Interface.sol";
import "./SafeERC20.sol";
import "../helpers/Ownable.sol";
import "../helpers/SafeMath.sol";


/**
 * @title TokenVesting
 * @dev A token holder contract that can release its token balance periodically during the vesting period.
 * It's a vesting scheme in which token balance is released proportionally by installments during the vesting period.
 * Optionally revocable by the owner.
 */
contract TokenVesting is Ownable {
  using SafeMath for uint256;
  using SafeERC20 for ERC20Interface;

  event Released(uint256 amount);
  event Revoked();

  // beneficiary of tokens after they are released
  address public beneficiary;

  uint256 public start;
  uint256 public duration;

  bool public revocable;

  mapping (address => uint256) public released;
  mapping (address => bool) public revoked;

  uint256 public installments;
  uint256 public interval_length;

  /**
   * @dev Creates a vesting contract that vests its balance of any ERC20 token to the
   * _beneficiary, periodically in proportional installments until _start + _duration. By then all
   * of the balance will have vested.
   * @param _beneficiary address of the beneficiary to whom vested tokens are transferred
   * @param _duration duration in seconds of the period in which the tokens will vest
   * @param _installments number of installments in which the balance will be vested
   * @param _revocable whether the vesting is revocable or not
   */
  function TokenVesting(address _beneficiary, uint256 _start, uint256 _duration, uint256 _installments, bool _revocable) public {
    require(_beneficiary != address(0));
    require(_installments > 0);

    beneficiary = _beneficiary;
    revocable = _revocable;
    duration = _duration;
    start = _start;
    installments = _installments;
    interval_length = _duration.div(_installments);
  }


  /**
   * @notice Transfers vested tokens to beneficiary.
   * @param token ERC20 token which is being vested
   */
  function release(ERC20Interface token) public {
    uint256 unreleased = releasableAmount(token);

    require(unreleased > 0);

    released[token] = released[token].add(unreleased);

    token.safeTransfer(beneficiary, unreleased);

    Released(unreleased);
  }

  /**
   * @notice Allows the owner to revoke the vesting. Tokens already vested
   * remain in the contract, the rest are returned to the owner.
   * @param token ERC20 token which is being vested
   */
  function revoke(ERC20Interface token) public onlyOwner {
    require(revocable);
    require(!revoked[token]);

    uint256 balance = token.balanceOf(this);

    uint256 unreleased = releasableAmount(token);
    uint256 refund = balance.sub(unreleased);

    revoked[token] = true;

    token.safeTransfer(owner, refund);

    Revoked();
  }

  /**
   * @dev Calculates the amount that has already vested but hasn't been released yet.
   * @param token ERC20 token which is being vested
   */
  function releasableAmount(ERC20Interface token) public view returns (uint256) {
    return vestedAmount(token).sub(released[token]);
  }

  /**
   * @dev Calculates the amount that has already vested.
   * @param token ERC20 token which is being vested
   */
  function vestedAmount(ERC20Interface token) public view returns (uint256) {
    uint256 currentBalance = token.balanceOf(this);
    uint256 totalBalance = currentBalance.add(released[token]);

    if (now < start) {
      return 0;
    } else if (now >= start.add(duration).sub(interval_length) || revoked[token]) {
      return totalBalance;
    } else {
      return totalBalance.div(installments).mul((now.sub(start)).div(interval_length).add(1));
    }
  }
}
