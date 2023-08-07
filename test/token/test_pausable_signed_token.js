let assertRevert = require('../helpers/assertRevert.js');

let PausableSignedTrasferToken = artifacts.require('PausableSignedTransferTokenMock');

contract('PausableSignedTrasferToken', function(accounts) {
  let token;

  const initialBalance = 100;
  const initialAccount = accounts[0];

  beforeEach('setup a new contract for each test', async function() {
    token = await PausableSignedTrasferToken.new(initialAccount, initialBalance);
  });

  it('owner can pause or unpause', async function(){
    await token.pause();
    assert.equal(true, await token.paused());

    await token.unpause();
    assert.equal(false, await token.paused());
  });

  it('non-owner cant pause', async function() {
    await assertRevert(token.pause({from: accounts[1]}));
  });

  it('non-owner cant unpause', async function() {
    await token.pause();
    await assertRevert(token.unpause({from: accounts[1]}));

    assert.equal(true, await token.paused());
  });

  describe('paused state', function() {
    beforeEach('Pause the token before each test', async function() {
      // make an approval prior to pausing so we can test transferFrom
      await token.approve(accounts[1], 10);
      await token.pause();
    });

    it('transfer is not possible', async function() {
      await assertRevert(token.transfer(accounts[1], 10, {from: initialAccount}));
    });

    it('transferFrom is not possible', async function() {
      await assertRevert(token.transferFrom(accounts[0], accounts[2], 10, {from: accounts[1]}));
    });

    it('approve is not possible', async function() {
      await assertRevert(token.approve(accounts[2], 10));
    });

    it('increaseApproval is not possible', async function() {
      await assertRevert(token.increaseApproval(accounts[1], 10));
    });

    it('decreaseApproval is not possible', async function() {
      await assertRevert(token.decreaseApproval(accounts[1], 10));
    });

    it('transferPreSigned is not possible', async function() {
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
      await assertRevert(token.transferPreSigned(from, to, value, fee, timestamp, v, r, s, {from: feeTaker}));
    });

    it('transferPreSignedMany is not possible', async function()  {
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
      await assertRevert(token.transferPreSignedMany(from, tos, values, fee, timestamp, v, r, s, {from: feeTaker}));
      // validate is transfer marked as settled
      assert.equal(await token.isTransactionAlreadySettled(from, calculatedHash), false);

    });

    it('transferPreSignedBulk is not possible', async function() {
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

      await assertRevert(token.transferPreSignedBulk(fromAll,
        toAll,
        valuesAll,
        feesAll,
        noncesAll,
        vAll,
        rAll,
        sAll,
        {from: feeTaker}
      ));
    });
  });

  describe('paused and then unpaused state', function() {
    beforeEach('Pause the token before each test', async function() {
      // make an approval prior to pausing so we can test transferFrom
      await token.approve(accounts[1], 10);
      await token.pause();
      await token.unpause();
    });

    it('transfer is possible', async function() {
      await token.transfer(accounts[1], 10);

      let initialAccountBalance = await token.balanceOf(accounts[0]);
      let destinationAccountBalance = await token.balanceOf(accounts[1]);

      assert.equal(initialAccountBalance, 90);
      assert.equal(destinationAccountBalance, 10);
    });

    it('transferFrom is possible', async function() {
      await token.transferFrom(accounts[0], accounts[2], 10, {from: accounts[1]});

      assert.equal(await token.balanceOf(accounts[0]), 90);
      assert.equal(await token.balanceOf(accounts[2]), 10);
    });

    it('approve is possible', async function() {
      await token.approve(accounts[2], 10);
      assert.equal(await token.allowance(accounts[0], accounts[2]), 10);
    });

    it('increaseApproval is possible', async function() {
      await token.increaseApproval(accounts[1], 10);
      assert.equal(await token.allowance(accounts[0], accounts[1]), 20);
    });

    it('decreaseApproval is possible', async function() {
      await token.decreaseApproval(accounts[1], 10);
      assert.equal(await token.allowance(accounts[0], accounts[1]), 0);
    });

    it('transferPreSigned is possible', async function() {
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

    it('transferPreSignedMany is possible', async function()  {
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
      await token.transferPreSignedMany(from, tos, values, fee, timestamp, v, r, s, {from: feeTaker});
      // validate is transfer marked as settled
      assert.equal(await token.isTransactionAlreadySettled(from, calculatedHash), true);

    });

    it('transferPreSignedBulk is possible', async function() {
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
  });



});
