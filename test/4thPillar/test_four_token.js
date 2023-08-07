let assertRevert = require('../helpers/assertRevert.js');
let ether = require('../helpers/ether.js');


let FourToken = artifacts.require('FourToken');


contract('FourToken', function(accounts) {
  let token;

  const owner = accounts[0];
  const cap = ether(400000000);

  beforeEach('setup a new contract for each test', async function() {
    token = await FourToken.new();
    await token.unpause();
  });

  it('should have a symbol of FOUR', async function() {
    assert.equal('FOUR', await token.symbol());
  })

  it('should have 18 decimal places', async function() {
    assert.equal(18, await token.decimals());
  })

  it('should have an owner', async function() {
    assert.equal(owner, await token.owner());
  });

  it('should be capped to 400 million', async function() {
    assert.equal(cap.valueOf(), await token.cap());
  });

  it('should be able to transfer owner', async function() {
    let newOwner = accounts[1];

    await token.transferOwnership(newOwner);
    assert.equal(newOwner, await token.owner());
  });

  it('should prevent non owner to transfer ownership', async function() {
    let newOwner = accounts[1];

    await assertRevert(token.transferOwnership(newOwner, {from: newOwner}));
    assert.equal(owner, await token.owner());
  });

  it('should allow owner to mint new tokens', async function() {
    let tokens = ether(100);  // 100 tokens
    let beneficiary = accounts[1];

    await token.mint(beneficiary, tokens);

    assert.equal(tokens.valueOf(), await token.balanceOf(beneficiary));
    assert.equal(tokens.valueOf(), await token.totalSupply())
  });

  it('should not allow non owner to mint new tokens', async function() {
    let tokens = ether(100);  // 100 tokens
    let beneficiary = accounts[1];

    await assertRevert(token.mint(beneficiary, tokens, {from: beneficiary}));

    assert.equal(0, await token.balanceOf(beneficiary));
    assert.equal(0, await token.totalSupply())
  });

  it('should allow owner to finish minting', async function() {
    let tokens = ether(100);  // 100 tokens
    let beneficiary = accounts[1];


    await token.finishMinting();
    assert.equal(true, await token.mintingFinished());

    // Make sure it does not allow new minting after finish is called
    await assertRevert(token.finishMinting());
    await assertRevert(token.mint(beneficiary, tokens));
  });

  it('should not allow non-owner to finish minting', async function() {
    let tokens = ether(100);  // 100 tokens
    let beneficiary = accounts[1];


    await assertRevert(token.finishMinting({from: beneficiary}));
    assert.equal(false, await token.mintingFinished());
  });

  it('should be able to mint untill cap is reached', async function() {
    let tokensFirst = ether(1000000);  // 1M tokens
    let beneficiaryFirst = accounts[1];

    let tokensSecond = ether(399000000); // 399M tokens
    let beneficiarySecond = accounts[2];

    await token.mint(beneficiaryFirst, tokensFirst);

    assert.equal(tokensFirst.valueOf(), await token.balanceOf(beneficiaryFirst));
    assert.equal(tokensFirst.valueOf(), await token.totalSupply())

    await token.mint(beneficiarySecond, tokensSecond);

    assert.equal(tokensSecond.valueOf(), await token.balanceOf(beneficiarySecond));
    assert.equal(cap.valueOf(), await token.totalSupply())
  });

  it('should not be able to mint after cap is reached', async function() {
    let beneficiary = accounts[1];

    await token.mint(beneficiary, cap);

    assert.equal(cap.valueOf(), await token.balanceOf(beneficiary));
    assert.equal(cap.valueOf(), await token.totalSupply())

    let tokens = 1; // 0.00000000000000001 FOUR
    await assertRevert(token.mint(beneficiary, tokens));

    assert.equal(false, await token.mintingFinished());
  });

  describe('signed transfer token tests', function() {
    let user = accounts[1];
    let tokens = ether(100); // 100 tokens, 18 decimal places

    let settler = accounts[2];
    let receiver = accounts[3];

    let value = ether(10);
    let fee = ether(0.1); // 0.1 FOUR as fee

    let timestamp = Date.now();

    beforeEach('mint tokens to the user', async function() {
      await token.mint(user, tokens);
    });

    it('should generate valid signature', async function() {
      // use the contract public view method to calculate the hash of the tx
      const calculatedHash = await token.calculateHash(user, receiver, value, fee, timestamp);

      // sign the transaction hash with senders account
      const signature = await web3.eth.sign(user, calculatedHash);

      r = signature.substr(0, 66);
      s = '0x' + signature.substr(66, 64);
      v = parseInt('0x' + signature.substr(130, 2)) + 27;

      const result = await token.isValidSignature(user, calculatedHash, v, r, s);

      assert.equal(result, true, 'Signature should be valid');
    });

    it('should allow 3rd party to transfer pre signed message', async function()  {
      // use the contract public view method to calculate the hash of the tx
      const calculatedHash = await token.calculateHash(user, receiver, value, fee, timestamp);

      // sign the transaction hash with senders account
      const signature = await web3.eth.sign(user, calculatedHash);

      r = signature.substr(0, 66);
      s = '0x' + signature.substr(66, 64);
      v = parseInt('0x' + signature.substr(130, 2)) + 27;

      // settle transaction from the third account
      const tx = await token.transferPreSigned(user, receiver, value, fee, timestamp, v, r, s, {from: settler});

      // validate is transfer marked as settled
      assert.equal(await token.isTransactionAlreadySettled(user, calculatedHash), true);

      // validate it correctly updated balances of respective accounts
      assert.equal(await token.balanceOf(settler), fee.valueOf(), "FeeTakers account balance should be 0.1 FOUR");
      assert.equal(await token.balanceOf(user), ether(100 - 10 - 0.1).valueOf(), "From account balance should be 89.9 FOUR");
      assert.equal(await token.balanceOf(receiver), value.valueOf(), "To account balance should be 10 FOUR");

      // make sure it also triggers all the events
      assert.equal(tx.logs[0].event, 'Transfer');
      assert.equal(tx.logs[0].args.from.valueOf(), user);
      assert.equal(tx.logs[0].args.to.valueOf(), receiver);
      assert.equal(tx.logs[0].args.value.valueOf(), value.valueOf());

      assert.equal(tx.logs[1].event, 'Transfer');
      assert.equal(tx.logs[1].args.from.valueOf(), user);
      assert.equal(tx.logs[1].args.to.valueOf(), settler);
      assert.equal(tx.logs[1].args.value.valueOf(), fee.valueOf());

      assert.equal(tx.logs[2].event, 'TransferPreSigned');
      assert.equal(tx.logs[2].args.from.valueOf(), user);
      assert.equal(tx.logs[2].args.to.valueOf(), receiver);
      assert.equal(tx.logs[2].args.settler.valueOf(), settler);
      assert.equal(tx.logs[2].args.value.valueOf(), value.valueOf());
      assert.equal(tx.logs[2].args.fee.valueOf(), fee.valueOf());
    });

  });

});
