pragma solidity ^0.4.17;

import './BaseToken.sol';

/**
* @title SignedTransferToken
* @dev The SignedTransferToken enables collection of fees for token transfers
* in native token currency. User will provide a signature that allows the third
* party to settle the transaction in his name and collect fee for provided
* serivce.
*/
contract SignedTransferToken is BaseToken {

  event TransferPreSigned(
    address indexed from,
    address indexed to,
    address indexed settler,
    uint256 value,
    uint256 fee
  );

  event TransferPreSignedMany(
    address indexed from,
    address indexed settler,
    uint256 value,
    uint256 fee
  );


  // Mapping of already executed settlements for a given address
  mapping(address => mapping(bytes32 => bool)) executedSettlements;

  /**
  * @dev Will settle a pre-signed transfer
  */
  function transferPreSigned(address _from,
                             address _to,
                             uint256 _value,
                             uint256 _fee,
                             uint256 _nonce,
                             uint8 _v,
                             bytes32 _r,
                             bytes32 _s) public returns (bool) {
    uint256 total = _value.add(_fee);
    bytes32 calcHash = calculateHash(_from, _to, _value, _fee, _nonce);

    require(_to != address(0));
    require(isValidSignature(_from, calcHash, _v, _r, _s));
    require(balances[_from] >= total);
    require(!executedSettlements[_from][calcHash]);

    executedSettlements[_from][calcHash] = true;

    // Move tokens
    balances[_from] = balances[_from].sub(_value);
    balances[_to] = balances[_to].add(_value);
    Transfer(_from, _to, _value);

    // Move fee
    balances[_from] = balances[_from].sub(_fee);
    balances[msg.sender] = balances[msg.sender].add(_fee);
    Transfer(_from, msg.sender, _fee);

    TransferPreSigned(_from, _to, msg.sender, _value, _fee);

    return true;
  }

  /**
  * @dev Settle multiple transactions in a single call. Please note that
  * should a single one fail the full state will be reverted. Your client
  * implementation should always first check for balances, correct signatures
  * and any other conditions that might result in failed transaction.
  */
  function transferPreSignedBulk(address[] _from,
                                 address[] _to,
                                 uint256[] _values,
                                 uint256[] _fees,
                                 uint256[] _nonces,
                                 uint8[] _v,
                                 bytes32[] _r,
                                 bytes32[] _s) public returns (bool) {
    // Make sure all the arrays are of the same length
    require(_from.length == _to.length &&
            _to.length ==_values.length &&
            _values.length == _fees.length &&
            _fees.length == _nonces.length &&
            _nonces.length == _v.length &&
            _v.length == _r.length &&
            _r.length == _s.length);

    for(uint i; i < _from.length; i++) {
      transferPreSigned(_from[i],
                        _to[i],
                        _values[i],
                        _fees[i],
                        _nonces[i],
                        _v[i],
                        _r[i],
                        _s[i]);
    }

    return true;
  }


  function transferPreSignedMany(address _from,
                                 address[] _tos,
                                 uint256[] _values,
                                 uint256 _fee,
                                 uint256 _nonce,
                                 uint8 _v,
                                 bytes32 _r,
                                 bytes32 _s) public returns (bool) {
   require(_tos.length == _values.length);
   uint256 total = getTotal(_tos, _values, _fee);

   bytes32 calcHash = calculateManyHash(_from, _tos, _values, _fee, _nonce);

   require(isValidSignature(_from, calcHash, _v, _r, _s));
   require(balances[_from] >= total);
   require(!executedSettlements[_from][calcHash]);

   executedSettlements[_from][calcHash] = true;

   // transfer to each recipient and take fee at the end
   for(uint i; i < _tos.length; i++) {
     // Move tokens
     balances[_from] = balances[_from].sub(_values[i]);
     balances[_tos[i]] = balances[_tos[i]].add(_values[i]);
     Transfer(_from, _tos[i], _values[i]);
   }

   // Move fee
   balances[_from] = balances[_from].sub(_fee);
   balances[msg.sender] = balances[msg.sender].add(_fee);
   Transfer(_from, msg.sender, _fee);

   TransferPreSignedMany(_from, msg.sender, total, _fee);

   return true;
  }

  function getTotal(address[] _tos, uint256[] _values, uint256 _fee) private view returns (uint256)  {
    uint256 total = _fee;

    for(uint i; i < _tos.length; i++) {
      total = total.add(_values[i]); // sum of all the values + fee
      require(_tos[i] != address(0)); // check that the recipient is a valid address
    }

    return total;
  }

  /**
  * @dev Calculates transfer hash for transferPreSignedMany
  */
  function calculateManyHash(address _from, address[] _tos, uint256[] _values, uint256 _fee, uint256 _nonce) public view returns (bytes32) {
    return keccak256(uint256(1), address(this), _from, _tos, _values, _fee, _nonce);
  }

  /**
  * @dev Calculates transfer hash.
  */
  function calculateHash(address _from, address _to, uint256 _value, uint256 _fee, uint256 _nonce) public view returns (bytes32) {
    return keccak256(uint256(0), address(this), _from, _to, _value, _fee, _nonce);
  }

  /**
  * @dev Validates the signature
  */
  function isValidSignature(address _signer, bytes32 _hash, uint8 _v, bytes32 _r, bytes32 _s) public pure returns (bool) {
    return _signer == ecrecover(
            keccak256("\x19Ethereum Signed Message:\n32", _hash),
            _v,
            _r,
            _s
        );
  }

  /**
  * @dev Allows you to check whether a certain transaction has been already
  * settled or not.
  */
  function isTransactionAlreadySettled(address _from, bytes32 _calcHash) public view returns (bool) {
    return executedSettlements[_from][_calcHash];
  }

}
