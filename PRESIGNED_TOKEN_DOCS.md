# Signed Transfer Token

You can provide your community with the ability to transact with your ERC20 token,
without the need to ever hold any Ether.

Normally Ether is used in order to pay for transaction fees to the Ethereum
network. The Signed Transfer Token enables you to offer your users a
centralized settlement service, that will write the transaction they wish to
make to the Ethereum network and collect the fees from the user in your ERC20
token as a compensation for the provided service.

## 1. Workflow

1. In your client application user A indicates that he/she wishes to make a transfer
of 100 tokens (TKN) to user B.
2. Your application calculates the fee that should be paid in TKN
3. User signs the transaction data with his/hers private key
4. Client application forwards the signed transaction data to the Settlement Service
5. Settlement Service validates that the transaction can be settled
6. Settlement Service makes a transaction to the Ethereum network - pays for gas in ETH and in return collects the fees from the user in TKN.
7. The transaction is completed. Client Application can update the transaction state

## 2. Smart Contract API

The token smart contract contains few additional functions that can be called by
the client application and the Settlement Service.

### 2.1 Calculating the Transaction Unique Hash

In order to make a transaction client application has to construct a transaction
hash first. The easiest way is to call the Smart Contract function named `calculateHash`.

The function takes as an input:

  - **_from** - address of the sender - User A
  - **_to** - address of the receiver - User B
  - **_value** - uint256 how many tokens should be transferred to user B
  - **_fee** - uint256 - how much fee is A paying for the transaction to the Settlement Service
  - **_nonce** - uint256 - unique number of the users transaction. We recommend using UNIX timestamp.

The function calculates the `keccak256` hash as following:

```
function calculateHash(address _from, address _to, uint256 _value, uint256 _fee, uint256 _nonce) public view returns (bytes32) {
  return keccak256(0, address(this), _from, _to, _value, _fee, _nonce);
}
```

### 2.2. Calculating the Transaction Unique Hash (Many)

You can give your users the ability to transfer to multiple addresses with a single call. This requires a different calculate hash function which we named  `calculateManyHash`.

The function takes as an input:

  - **_from** - address of the sender - User A
  - **_tos** - array of addresses - receivers  - User B, User C, User D, ...
  - **_values** - array of uint256 how many tokens should be transferred to user B, C, D, ...
  - **_fee** - uint256 - how much fee is A paying for the transaction to the Settlement Service
  - **_nonce** - uint256 - unique number of the users transaction. We recommend using UNIX timestamp.

The function calculates the `keccak256` hash as following:

```
function calculateManyHash(address _from, address[] _tos, uint256[] _values, uint256 _fee, uint256 _nonce) public view returns (bytes32) {
  return keccak256(1, address(this), _from, _tos, _values, _fee, _nonce);
}
```

### 2.3. Verifying Transaction Settlement Status

Client application should always verify if the transaction has been already settled.

Token Smart Contract provides a function `isTransactionAlreadySettled` for this purpose.

The function takes as an input:

 - **_from** - address of the sender - User A
 - **_calcHash** - bytes32, hash that was returned from the `calculateHash` function

 The function returns either **true** or **false**.

### 2.4. Verifying Transaction Signature and Balances

To save on gas costs in case of failed settlements Settlement Service should, prior to submitting the transaction for settlement, always check balance of the sender and signature of
the transaction.

Balance can be checked using standard ERC20 function `balanceOf`. Validity of the signature is checked with the help of `isValidSignature`.

Input parameters:
 - **_signer** - address of the User A
 - **_hash** - bytes32 - hash of the transaction
 - **_v** - uint8
 - **_r** - bytes32
 - **_s** - bytes32

 The function returns either **true** or **false**.

### 2.5. Settling the transaction

Smart Contract allows you to settle a single transaction or several transactions
with one function call - should provide some gas savings.

Functions that enable settlement are `transferPreSigned`, `transferPreSignedBulk` and `transferPreSignedMany`.

Input parameters are the same for both `transferPreSigned` and `transferPreSignedBulk`, only difference being that the Bulk settlement accepts arrays for each parameter:

- **_from** - address of the sender - User A
- **_to** - address of the receiver - User B
- **_value** - uint256 how many tokens should be transferred to user B
- **_fee** - uint256 - how much fee is A paying for the transaction to the Settlement Service
- **_nonce** - uint256 - unique number of the users transaction. We recommend using UNIX timestamp.
- **_v** - uint8
- **_r** - bytes32
- **_s** - bytes32

The `transferPreSignedMany` takes in

- **_from** - address of the sender - User A
- **_tos** - array of address - receivers - User B, C, D, ...
- **_values** - array of uint256 -  how many tokens should be transferred to user B, C, D, ...
- **_fee** - uint256 - how much fee is A paying for the transaction to the Settlement Service
- **_nonce** - uint256 - unique number of the users transaction. We recommend using UNIX timestamp.
- **_v** - uint8
- **_r** - bytes32
- **_s** - bytes32

Upon successful settlement the Smart Contract triggers following events:

- **Transfer** - Standard ERC20 event. From user A to B for the **_value**
- **Transfer** - Standard ERC20 event. From user A to Settlement Service for the **_fee**
- **TransferPreSigned** - Containing **from**, **to**, **settler**, **value** and **fee**



## 3. Sample Javascript code

 ```
 let from = accounts[0];
 let to = accounts[1];
 let value = 20;
 let fee = 2;
 let timestamp = Date.now();

 let feeTaker = accounts[2];

 // use the contract public view method to calculate the hash of the tx
 const calculatedHash = await token.calculateHash(from, to, value, fee, timestamp);

 // sign the transaction hash with senders account
 const signature = await web3.eth.sign(from, calculatedHash);

 r = signature.substr(0, 66);
 s = '0x' + signature.substr(66, 64);
 v = parseInt('0x' + signature.substr(130, 2)) + 27;

 // settle transaction from the third account
 const tx = await token.transferPreSigned(from, to, value, fee, timestamp, v, r, s, {from: feeTaker});

 ```
