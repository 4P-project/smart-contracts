let assertRevert = require('../helpers/assertRevert.js');

let SignedTransferToken = artifacts.require('SignedTransferTokenMock');

contract('SignedTransferToken', function(accounts) {
  let token;

  let initialAccount = accounts[0];
  let initialBalance = 100;

  beforeEach('setup a new contract for each test', async function() {
    token = await SignedTransferToken.new(initialAccount, initialBalance);
  });

  it('should generate valid signature', async function()  {
    let from = accounts[0];
    let to = accounts[1];
    let value = 20;
    let fee = 2;
    let timestamp = Date.now();

    // use the contract public view method to calculate the hash of the tx
    const calculatedHash = await token.calculateHash(from, to, value, fee, timestamp);

    // sign the transaction hash with senders account
    const signature = await web3.eth.sign(from, calculatedHash);

    r = signature.substr(0, 66);
    s = '0x' + signature.substr(66, 64);
    v = parseInt('0x' + signature.substr(130, 2)) + 27;

    const result = await token.isValidSignature(from, calculatedHash, v, r, s);

    assert.equal(result, true, 'Signature should be valid');
  });

  it('should generate valid signature for many', async function()  {
    let from = accounts[0];
    let tos = [accounts[1], accounts[2]];
    let values = [20, 10];
    let fee = 2;
    let timestamp = Date.now();

    // use the contract public view method to calculate the hash of the tx
    const calculatedHash = await token.calculateManyHash(from, tos, values, fee, timestamp);

    // sign the transaction hash with senders account
    const signature = await web3.eth.sign(from, calculatedHash);

    r = signature.substr(0, 66);
    s = '0x' + signature.substr(66, 64);
    v = parseInt('0x' + signature.substr(130, 2)) + 27;

    const result = await token.isValidSignature(from, calculatedHash, v, r, s);

    assert.equal(result, true, 'Signature should be valid');
  });

  it('should allow 3rd party to transfer pre signed message', async function()  {
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

    // validate is transfer marked as settled
    assert.equal(await token.isTransactionAlreadySettled(from, calculatedHash), true);

    // validate it correctly updated balances of respective accounts
    assert.equal(await token.balanceOf(feeTaker), 2, "FeeTakers account balance should be 2");
    assert.equal(await token.balanceOf(from), 78, "From account balance should be 78");
    assert.equal(await token.balanceOf(to), 20, "To account balance should be 20");

    // make sure it also triggers all the events
    assert.equal(tx.logs[0].event, 'Transfer');
    assert.equal(tx.logs[0].args.from.valueOf(), from);
    assert.equal(tx.logs[0].args.to.valueOf(), to);
    assert.equal(tx.logs[0].args.value.valueOf(), 20);

    assert.equal(tx.logs[1].event, 'Transfer');
    assert.equal(tx.logs[1].args.from.valueOf(), from);
    assert.equal(tx.logs[1].args.to.valueOf(), feeTaker);
    assert.equal(tx.logs[1].args.value.valueOf(), 2);

    assert.equal(tx.logs[2].event, 'TransferPreSigned');
    assert.equal(tx.logs[2].args.from.valueOf(), from);
    assert.equal(tx.logs[2].args.to.valueOf(), to);
    assert.equal(tx.logs[2].args.settler.valueOf(), feeTaker);
    assert.equal(tx.logs[2].args.value.valueOf(), 20);
    assert.equal(tx.logs[2].args.fee.valueOf(), 2);
  });

  it('should allow third party to settle many transaction', async function()  {
    let from = accounts[0];
    let tos = [accounts[1], accounts[2]];
    let values = [20, 10];
    let fee = 2;
    let timestamp = Date.now();

    let feeTaker = accounts[3];

    // use the contract public view method to calculate the hash of the tx
    const calculatedHash = await token.calculateManyHash(from, tos, values, fee, timestamp);

    // sign the transaction hash with senders account
    const signature = await web3.eth.sign(from, calculatedHash);

    r = signature.substr(0, 66);
    s = '0x' + signature.substr(66, 64);
    v = parseInt('0x' + signature.substr(130, 2)) + 27;

    // settle transaction from the third account
    const tx = await token.transferPreSignedMany(from, tos, values, fee, timestamp, v, r, s, {from: feeTaker});
    // validate is transfer marked as settled
    assert.equal(await token.isTransactionAlreadySettled(from, calculatedHash), true);

    // validate it correctly updated balances of respective accounts
    assert.equal(await token.balanceOf(feeTaker), 2, "FeeTakers account balance should be 2");
    assert.equal(await token.balanceOf(from), 68, "From account balance should be 68");
    assert.equal(await token.balanceOf(accounts[1]), 20, "To account balance should be 20");
    assert.equal(await token.balanceOf(accounts[2]), 10, "To account balance should be 10");

    assert.equal(tx.logs[0].event, 'Transfer');
    assert.equal(tx.logs[0].args.from.valueOf(), from);
    assert.equal(tx.logs[0].args.to.valueOf(), tos[0], 'transfer one recipient not correct');
    assert.equal(tx.logs[0].args.value.valueOf(), 20);

    assert.equal(tx.logs[1].event, 'Transfer');
    assert.equal(tx.logs[1].args.from.valueOf(), from);
    assert.equal(tx.logs[1].args.to.valueOf(), tos[1], 'transfer two recipient not correct');
    assert.equal(tx.logs[1].args.value.valueOf(), 10);

    assert.equal(tx.logs[2].event, 'Transfer');
    assert.equal(tx.logs[2].args.from.valueOf(), from);
    assert.equal(tx.logs[2].args.to.valueOf(), feeTaker, 'fee taker is not the msg.sender');
    assert.equal(tx.logs[2].args.value.valueOf(), 2);

  });

  it('should fail to settle transaction if the recipient is zero address', async function()  {
    let from = accounts[0];
    let to = 0x0;
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
    await assertRevert(token.transferPreSigned(from, to, value, fee, timestamp, v, r, s, {from: feeTaker}));
  });

  it('should fail to settle many transaction if one recipient is 0x0', async function()  {
    let from = accounts[0];
    let tos = [accounts[1], 0x0];
    let values = [20, 10];
    let fee = 2;
    let timestamp = Date.now();

    let feeTaker = accounts[3];

    // use the contract public view method to calculate the hash of the tx
    const calculatedHash = await token.calculateManyHash(from, tos, values, fee, timestamp);

    // sign the transaction hash with senders account
    const signature = await web3.eth.sign(from, calculatedHash);

    r = signature.substr(0, 66);
    s = '0x' + signature.substr(66, 64);
    v = parseInt('0x' + signature.substr(130, 2)) + 27;

    // settle transaction from the third account
    await assertRevert(token.transferPreSignedMany(from, tos, values, fee, timestamp, v, r, s, {from: feeTaker}));
    // validate is transfer marked as settled
    assert.equal(await token.isTransactionAlreadySettled(from, calculatedHash), false);

  });

  it('should fail to settle transaction if the signature is invalid', async function()  {
    let from = accounts[0];
    let to = accounts[1];
    let value = 20;
    let fee = 2;
    let timestamp = Date.now();

    let feeTaker = accounts[2];

    // use the contract public view method to calculate the hash of the tx
    const calculatedHash = await token.calculateHash(from, to, value, fee, timestamp);

    // fake signature from other account
    const signature = await web3.eth.sign(feeTaker, calculatedHash);

    r = signature.substr(0, 66);
    s = '0x' + signature.substr(66, 64);
    v = parseInt('0x' + signature.substr(130, 2)) + 27;

    // settle transaction from the third account
    await assertRevert(token.transferPreSigned(from, to, value, fee, timestamp, v, r, s, {from: feeTaker}));
  });


  it('should fail to settle transaction if total amount exceeds balance', async function()  {
    let from = accounts[0];
    let to = accounts[1];
    // total = value + fee > initialBalance
    let value = 99;
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
    await assertRevert(token.transferPreSigned(from, to, value, fee, timestamp, v, r, s, {from: feeTaker}));
    // validate is transfer is still not settled
    assert.equal(await token.isTransactionAlreadySettled(from, calculatedHash), false);
  });

  it('should fail to settle many transaction if amount exceeds balance', async function()  {
    let from = accounts[0];
    let tos = [accounts[1], accounts[2]];
    let values = [90, 10];
    let fee = 2;
    let timestamp = Date.now();

    let feeTaker = accounts[3];

    // use the contract public view method to calculate the hash of the tx
    const calculatedHash = await token.calculateManyHash(from, tos, values, fee, timestamp);

    // sign the transaction hash with senders account
    const signature = await web3.eth.sign(from, calculatedHash);

    r = signature.substr(0, 66);
    s = '0x' + signature.substr(66, 64);
    v = parseInt('0x' + signature.substr(130, 2)) + 27;

    const result = await token.isValidSignature(from, calculatedHash, v, r, s);

    assert.equal(result, true, 'Signature should be valid');
    // settle transaction from the third account
    await assertRevert(token.transferPreSignedMany(from, tos, values, fee, timestamp, v, r, s, {from: feeTaker}));
    // validate is transfer marked as settled
    assert.equal(await token.isTransactionAlreadySettled(from, calculatedHash), false);

  });

  it('should fail to settle transaction if already settled', async function()  {
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

    assert.equal(await token.isTransactionAlreadySettled(from, calculatedHash), false);

    // settle transaction from the third account
    await token.transferPreSigned(from, to, value, fee, timestamp, v, r, s, {from: feeTaker});
    // validate is transfer marked as settled
    assert.equal(await token.isTransactionAlreadySettled(from, calculatedHash), true);

    // settle for the second time
    await assertRevert(token.transferPreSigned(from, to, value, fee, timestamp, v, r, s, {from: feeTaker}));
  });

  it('should fail to settle many transaction if already settled', async function()  {
    let from = accounts[0];
    let tos = [accounts[1], accounts[2]];
    let values = [20, 10];
    let fee = 2;
    let timestamp = Date.now();

    let feeTaker = accounts[3];

    // use the contract public view method to calculate the hash of the tx
    const calculatedHash = await token.calculateManyHash(from, tos, values, fee, timestamp);

    // sign the transaction hash with senders account
    const signature = await web3.eth.sign(from, calculatedHash);

    r = signature.substr(0, 66);
    s = '0x' + signature.substr(66, 64);
    v = parseInt('0x' + signature.substr(130, 2)) + 27;

    // settle transaction from the third account
    await token.transferPreSignedMany(from, tos, values, fee, timestamp, v, r, s, {from: feeTaker})
    await assertRevert(token.transferPreSignedMany(from, tos, values, fee, timestamp, v, r, s, {from: feeTaker}));
    // validate is transfer marked as settled
    assert.equal(await token.isTransactionAlreadySettled(from, calculatedHash), true);

  });

  it('should settle multiple successful transactions at once', async function() {
    let fromFirst = accounts[0];
    let toFirst = accounts[1];
    let valueFirst = 10;
    let feeFirst = 1;
    let timestampFirst = Date.now();

    let feeTaker = accounts[2];

    // use the contract public view method to calculate the hash of the tx
    const calculatedHashFirst = await token.calculateHash(fromFirst,
      toFirst,
      valueFirst,
      feeFirst,
      timestampFirst
    );

    // sign the transaction hash with senders account
    const signatureFirst = await web3.eth.sign(fromFirst, calculatedHashFirst);

    rFirst = signatureFirst.substr(0, 66);
    sFirst = '0x' + signatureFirst.substr(66, 64);
    vFirst = parseInt('0x' + signatureFirst.substr(130, 2)) + 27;

    // Second transaction
    let fromSecond = accounts[0];
    let toSecond = accounts[3];
    let valueSecond = 20;
    let feeSecond = 2;
    let timestampSecond = Date.now()+1;

    // use the contract public view method to calculate the hash of the tx
    const calculatedHashSecond = await token.calculateHash(fromSecond,
      toSecond,
      valueSecond,
      feeSecond,
      timestampSecond
    );

    // sign the transaction hash with senders account
    const signatureSecond = await web3.eth.sign(fromSecond, calculatedHashSecond);

    rSecond = signatureSecond.substr(0, 66);
    sSecond = '0x' + signatureSecond.substr(66, 64);
    vSecond = parseInt('0x' + signatureSecond.substr(130, 2)) + 27;


    fromAll = [fromFirst, fromSecond];
    toAll = [toFirst, toSecond];
    valuesAll = [valueFirst, valueSecond];
    feesAll = [feeFirst, feeSecond];
    noncesAll = [timestampFirst, timestampSecond];
    vAll = [vFirst, vSecond];
    rAll = [rFirst, rSecond];
    sAll = [sFirst, sSecond];


    const tx = token.transferPreSignedBulk(fromAll,
      toAll,
      valuesAll,
      feesAll,
      noncesAll,
      vAll,
      rAll,
      sAll,
      {from: feeTaker}
    );

    assert.equal(await token.isTransactionAlreadySettled(fromFirst, calculatedHashFirst), true);
    assert.equal(await token.isTransactionAlreadySettled(fromSecond, calculatedHashSecond), true);

    assert.equal((await token.balanceOf(toFirst)).toNumber(), 10);
    assert.equal((await token.balanceOf(toSecond)).toNumber(), 20);
    assert.equal((await token.balanceOf(feeTaker)).toNumber(), 3);
    assert.equal((await token.balanceOf(accounts[0])).toNumber(), 67);

  });

  it('should revert all settlements should one fail', async function() {
    let fromFirst = accounts[0];
    let toFirst = accounts[1];
    let valueFirst = 10;
    let feeFirst = 1;
    let timestampFirst = Date.now();

    let feeTaker = accounts[2];

    // use the contract public view method to calculate the hash of the tx
    const calculatedHashFirst = await token.calculateHash(fromFirst,
      toFirst,
      valueFirst,
      feeFirst,
      timestampFirst
    );

    // sign the transaction hash with senders account
    const signatureFirst = await web3.eth.sign(fromFirst, calculatedHashFirst);

    rFirst = signatureFirst.substr(0, 66);
    sFirst = '0x' + signatureFirst.substr(66, 64);
    vFirst = parseInt('0x' + signatureFirst.substr(130, 2)) + 27;

    // Second transaction
    let fromSecond = accounts[0];
    let toSecond = 0x0;  // INVALID ADDRESS TO TRIGGER FAILURE
    let valueSecond = 20;
    let feeSecond = 2;
    let timestampSecond = Date.now()+1;

    // use the contract public view method to calculate the hash of the tx
    const calculatedHashSecond = await token.calculateHash(fromSecond,
      toSecond,
      valueSecond,
      feeSecond,
      timestampSecond
    );

    // sign the transaction hash with senders account
    const signatureSecond = await web3.eth.sign(fromSecond, calculatedHashSecond);

    rSecond = signatureSecond.substr(0, 66);
    sSecond = '0x' + signatureSecond.substr(66, 64);
    vSecond = parseInt('0x' + signatureSecond.substr(130, 2)) + 27;


    fromAll = [fromFirst, fromSecond];
    toAll = [toFirst, toSecond];
    valuesAll = [valueFirst, valueSecond];
    feesAll = [feeFirst, feeSecond];
    noncesAll = [timestampFirst, timestampSecond];
    vAll = [vFirst, vSecond];
    rAll = [rFirst, rSecond];
    sAll = [sFirst, sSecond];

    await assertRevert(token.transferPreSignedBulk(fromAll,
        toAll,
        valuesAll,
        feesAll,
        noncesAll,
        vAll,
        rAll,
        sAll,
        {from: feeTaker}
      )
    );

    assert.equal(await token.isTransactionAlreadySettled(fromFirst, calculatedHashFirst), false);
    assert.equal(await token.isTransactionAlreadySettled(fromSecond, calculatedHashSecond), false);

    assert.equal((await token.balanceOf(toFirst)).toNumber(), 0);
    assert.equal((await token.balanceOf(toSecond)).toNumber(), 0);
    assert.equal((await token.balanceOf(feeTaker)).toNumber(), 0);
    assert.equal((await token.balanceOf(accounts[0])).toNumber(), 100);
  });

});
