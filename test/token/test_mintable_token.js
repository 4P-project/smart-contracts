let assertRevert = require('../helpers/assertRevert.js');

let MintableToken = artifacts.require('MintableToken');

contract('MintableToken', function(accounts) {

  let token;

  beforeEach('setup a new contract for each test', async function() {
    token = await MintableToken.new();
  });

  it('should start with total supply of 0', async function() {
    let result = await token.totalSupply();

    assert.equal(result, 0);
  });

  it('mint finished should be false after initialization', async function() {
    let result = await token.mintingFinished();

    assert.equal(result, false);
  });

  it('should mint tokens to a given address', async function() {
    let tx = await token.mint(accounts[1], 100);

    assert.equal(tx.logs[0].event, 'Mint');
    assert.equal(tx.logs[0].args.to.valueOf(), accounts[1]);
    assert.equal(tx.logs[0].args.amount.valueOf(), 100);
    assert.equal(tx.logs[1].event, 'Transfer');
    assert.equal(tx.logs[1].args.from.valueOf(), 0x0);
    assert.equal(tx.logs[1].args.to.valueOf(), accounts[1]);
    assert.equal(tx.logs[1].args.value.valueOf(), 100);

    let balance = await token.balanceOf(accounts[1]);
    assert.equal(balance, 100);

    let totalSupply = await token.totalSupply();
    assert.equal(totalSupply, 100);
  });

  it('should not allow non-owner to mint', async function() {
    await assertRevert(token.mint(accounts[1], 100, {from: accounts[1]}));
  });

  it('should not allow non-owner to finish minting', async function() {
    await assertRevert(token.finishMinting({from: accounts[1]}));
  });

  it('should set mintingFinished to false after fished is called', async function() {
    await token.finishMinting();

    let result = await token.mintingFinished();
    assert.equal(result, true);
  });

  it('should not allow minting after mint finished', async function() {
    await token.finishMinting();

    await assertRevert(token.mint(accounts[1], 100));
  });

});
