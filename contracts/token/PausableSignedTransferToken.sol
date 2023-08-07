pragma solidity ^0.4.17;


import './PausableToken.sol';
import './SignedTransferToken.sol';

contract PausableSignedTransferToken is SignedTransferToken, PausableToken {

  function transferPreSigned(address _from,
                             address _to,
                             uint256 _value,
                             uint256 _fee,
                             uint256 _nonce,
                             uint8 _v,
                             bytes32 _r,
                             bytes32 _s) public whenNotPaused returns (bool) {
    return super.transferPreSigned(_from, _to, _value, _fee, _nonce, _v, _r, _s);
  }

  function transferPreSignedBulk(address[] _from,
                                 address[] _to,
                                 uint256[] _values,
                                 uint256[] _fees,
                                 uint256[] _nonces,
                                 uint8[] _v,
                                 bytes32[] _r,
                                 bytes32[] _s) public whenNotPaused returns (bool) {
    return super.transferPreSignedBulk(_from, _to, _values, _fees, _nonces, _v, _r, _s);
  }

  function transferPreSignedMany(address _from,
                                 address[] _tos,
                                 uint256[] _values,
                                 uint256 _fee,
                                 uint256 _nonce,
                                 uint8 _v,
                                 bytes32 _r,
                                 bytes32 _s) public whenNotPaused returns (bool) {
    return super.transferPreSignedMany(_from, _tos, _values, _fee, _nonce, _v, _r, _s);
  }
}
