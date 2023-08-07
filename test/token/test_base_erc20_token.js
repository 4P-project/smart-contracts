let assertRevert = require('../helpers/assertRevert.js');

let BaseTokenMock = artifacts.require('BaseTokenMock');

contract('BaseToken', function(accounts) {
  let token;

  const initialBalance = 1000;
  const initialAccount = accounts[0];

  beforeEach('setup a new contract for each test', async function() {
    token = await BaseTokenMock.new(initialAccount, initialBalance);
  });

  it('should return correct total supply', async function() {
    const result = await token.totalSupply();

    assert.equal(result, initialBalance);
  });

  it('should return correct balance for initial account', async function() {
    const result = await token.balanceOf(initialAccount);

    assert.equal(result, initialBalance);
  });

  it('should return balaceOf 0 for non initial account', async function() {
    const result = await token.balanceOf(accounts[1]);

    assert.equal(result, 0);
  });

  it('should throw if transfer value is greater than balance', async function() {
    const destinationAccount = accounts[1];
    const transferValue = 1001;

    await assertRevert(token.transfer(destinationAccount, transferValue, {from: initialAccount}));
  });

  it('should throw if destination address is equal to 0x0', async function() {
    const zeroAccount = 0x0;

    await assertRevert(token.transfer(zeroAccount, 10, {from: initialAccount}));
  });

  it('should be able to transfer funds correctly', async function() {
    const destinationAccount = accounts[1]
    const transferValue = 10;

    await token.transfer(destinationAccount, transferValue, {from: initialAccount});

    let initialAccountBalance = await token.balanceOf(initialAccount);
    let destinationAccountBalance = await token.balanceOf(destinationAccount);

    assert.equal(initialAccountBalance, 990);
    assert.equal(destinationAccountBalance, 10);
  });

  it('should be able to transfer all balance', async function() {
    const destinationAccount = accounts[1]
    const transferValue = 1000;

    await token.transfer(destinationAccount, transferValue, {from: initialAccount});

    let initialAccountBalance = await token.balanceOf(initialAccount);
    let destinationAccountBalance = await token.balanceOf(destinationAccount);

    assert.equal(initialAccountBalance, 0);
    assert.equal(destinationAccountBalance, 1000);
  });

  it('should return correct amount after approval', async function() {
    const spender = accounts[1];

    await token.approve(spender, 100, {from: initialAccount});
    let response = await token.allowance(initialAccount, spender);

    assert.equal(response, 100);
  });

  it('should be able to reset allowance to 0', async function() {
    const spender = accounts[1];

    await token.approve(spender, 100, {from: initialAccount});
    let response = await token.allowance(initialAccount, spender);
    assert.equal(response, 100);

    await token.approve(spender, 0, {from: initialAccount});
    let response2 = await token.allowance(initialAccount, spender);
    assert.equal(response2, 0);
  });

  it('should return correct balances after transfering from another account', async function() {
    const approvedAcc = accounts[1];
    const destinationAcc = accounts[2];

    await token.approve(approvedAcc, 100, {from: initialAccount});
    // transfering
    await token.transferFrom(initialAccount, destinationAcc, 90, {from: approvedAcc});

    // check balances
    let balance_of_first_account = await token.balanceOf(initialAccount);
    assert.equal(balance_of_first_account, 910);

    let balance_of_destination_acc = await token.balanceOf(destinationAcc);
    assert.equal(balance_of_destination_acc, 90);

  });

  it('should decrease allowance after transfering from another account', async function() {
    const approvedAcc = accounts[1];
    const destinationAcc = accounts[2];

    await token.approve(approvedAcc, 100, {from: initialAccount});
    // transfering
    await token.transferFrom(initialAccount, destinationAcc, 90, {from: approvedAcc});

    // check allowance
    let response = await token.allowance(initialAccount, approvedAcc);
    assert.equal(response, 10);

  });

  it('should throw if transfering more than allowed from another account', async function() {
    const approvedAcc = accounts[1];
    const destinationAcc = accounts[2];

    await token.approve(approvedAcc, 100, {from: initialAccount});

    await assertRevert(token.transferFrom(initialAccount, destinationAcc, 900, {from: approvedAcc}));
  });

  it('should throw an error when trying to transferFrom more than _from has', async function () {
    const approvedAcc = accounts[1];
    const approvalAmount = 2000;

    let balance0 = await token.balanceOf(initialAccount);

    await token.approve(approvedAcc, approvalAmount);

    await assertRevert(token.transferFrom(initialAccount, accounts[2], balance0 + 1, { from: approvedAcc }));
  });

  it('should throw if destination address of transferFrom is equal to 0x0', async function() {
    const zeroAccount = 0x0;
    const approvedAcc = accounts[1];

    await token.approve(approvedAcc, 100);

    await assertRevert(token.transferFrom(initialAccount, zeroAccount, 10, {from: approvedAcc}));
  });

  describe('validating allowance updates to spender', function () {
    let approved;
    const spender = accounts[1];

    it('should start with zero', async function() {
      approved = await token.allowance(initialAccount, spender);
      assert.equal(approved, 0);
    });

    it('should increase by 50 then decrease by 10', async function() {
      await token.increaseApproval(spender, 50, {from: initialAccount});
      let postIncrease = await token.allowance(initialAccount, spender);

      approved += 50;
      assert.equal(postIncrease.toNumber(), approved);

      await token.decreaseApproval(spender, 10, {from: initialAccount});
      let postDecrease = await token.allowance(initialAccount, spender);

      approved -= 10;
      assert.equal(postDecrease.toNumber(), approved);
    });

    it('should decrease to 0 after decreasing by more than allowance', async function() {
      await token.decreaseApproval(spender, approved+1, {from: initialAccount});

      let response = await token.allowance(initialAccount, spender);
      assert.equal(response.toNumber(), 0);
    });
  });


});
