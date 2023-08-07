let assertRevert = require('../helpers/assertRevert.js');

let PausableToken = artifacts.require('PausableTokenMock');

contract('PausableToken', function(accounts) {
  let token;

  const initialBalance = 100;
  const initialAccount = accounts[0];

  beforeEach('setup a new contract for each test', async function() {
    token = await PausableToken.new(initialAccount, initialBalance);
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
  });



});
