let EVMTime = require('../helpers/increaseEVMTime.js');
let assertRevert = require('../helpers/assertRevert.js');

let MintableToken = artifacts.require('MintableToken');
let LinearTokenVesting = artifacts.require('LinearTokenVesting');


contract('LinearTokenVesting', function(accounts) {
  let vesting;
  let token;

  let beneficiary = accounts[1];
  let start;
  let cliff;
  let duration;

  const totalVestedAmount = 1000;

  let snapshotId;

  beforeEach('setup a new contract for each test', async function() {
    token = await MintableToken.new({from: accounts[0]});

    start = EVMTime.lastTime() + EVMTime.duration.minutes(1);
    cliff =  EVMTime.duration.years(1);
    duration = EVMTime.duration.years(2);

    vesting = await LinearTokenVesting.new(beneficiary,
      start,
      cliff,
      duration,
      true // revocable
    );

    // Mint tokens to the vesting contract
    await token.mint(vesting.address, totalVestedAmount, {from: accounts[0]});

  });

  afterEach('revert time back', async function() {
    //await EVMTime.increaseTimeTo(new Date());
  });

  it('has an owner', async function() {
    assert.equal(await vesting.owner(), accounts[0]);
  });

  it('cannot be released before cliff', async function() {

    await assertRevert(vesting.release(token.address));
    assert(await token.balanceOf(token.address), totalVestedAmount);
  });

  it('should release proper amount after cliff', async function() {
    await EVMTime.increaseTimeTo(start + cliff);

    const tx = await vesting.release(token.address);
    const releaseTime = web3.eth.getBlock(tx.receipt.blockNumber).timestamp;

    const expectedAmount = Math.floor(totalVestedAmount*(releaseTime - start) / (duration));

    // Make sure it triggers the event
    assert.equal(tx.logs[0].event, 'Released');
    assert.equal(tx.logs[0].args.amount.valueOf(), expectedAmount);
    // Does it release correct amount
    assert.equal(await token.balanceOf(beneficiary), expectedAmount);
    assert.equal(await token.balanceOf(vesting.address), totalVestedAmount - expectedAmount);
  });

  it('should release linearly during vesting period', async function() {
    const vestingPeriod = duration - cliff;

    const checkpoints = 12;

    for(let i=1; i <= checkpoints; i++) {
      // simulate current time increase
      const now = start + cliff + i*(vestingPeriod / checkpoints);
      await EVMTime.increaseTimeTo(now);

      const tx = await vesting.release(token.address);
      const releaseTime = web3.eth.getBlock(tx.receipt.blockNumber).timestamp;
      const expectedAmount = Math.floor(totalVestedAmount*(releaseTime - start) / (duration));

      assert.equal(await token.balanceOf(beneficiary), expectedAmount);
    }
  });

  it('should release all the funds after vesting period is completed', async function() {
    await EVMTime.increaseTimeTo(start + duration);
    await vesting.release(token.address);
    const balance = await token.balanceOf(beneficiary);
    assert.equal(balance, totalVestedAmount);
  });

  it('should be able to revoke', async function() {
    await vesting.revoke(token.address);
    assert.equal(await vesting.revoked(token.address), true);
  });

  it('should fail to be revoked by owner if revocable not set', async function () {
    vesting = await LinearTokenVesting.new(beneficiary, start, cliff, duration, false, { from: accounts[0] });
    await assertRevert(vesting.revoke(token.address, { from: accounts[0] }));
  });

  it('should return non-vested tokens to owner', async function() {
    await EVMTime.increaseTimeTo(start + cliff + EVMTime.duration.weeks(12));

    const vested = await vesting.vestedAmount(token.address);
    await vesting.revoke(token.address);

    assert.equal(await token.balanceOf(accounts[0]), totalVestedAmount - vested);
  });

  it('should keep vested tokens after revocation', async function() {
    await EVMTime.increaseTimeTo(start + cliff + EVMTime.duration.weeks(12));

    let vestedPre = await vesting.vestedAmount(token.address);
    await vesting.revoke(token.address);
    let vestedPost = await vesting.vestedAmount(token.address);

    assert.equal(vestedPre.valueOf(), vestedPost.valueOf());
  });

  it('should allow user to claim vested tokens after revocation', async function() {
    await EVMTime.increaseTimeTo(start + cliff + EVMTime.duration.weeks(12));

    let vested = await vesting.vestedAmount(token.address);
    await vesting.revoke(token.address);
    await vesting.release(token.address);

    assert.equal(vested.valueOf(), await token.balanceOf(beneficiary))
  });

});
