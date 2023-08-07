let assertRevert = require(__dirname + '/helpers/assertRevert.js');

let Pausable = artifacts.require('PausableMock');


contract('Pausable', function(accounts) {
  let pausable;

  beforeEach('setup a new contract for each test', async function() {
    pausable = await Pausable.new({from: accounts[0]});
  });

  it('assert it has owner', async function() {
    assert.equal(await pausable.owner(), accounts[0], 'Address should be the same');
  });


  it('should start as not paused', async function() {
    await pausable.somePausableFunction();
    await assertRevert(pausable.onlyWhenPaused());

    assert.equal(false, await pausable.somethingHappened());
    assert.equal(1, await pausable.counter());
  })

  it('should not allow onlyWhenPaused in unpaused state', async function() {
    await assertRevert(pausable.onlyWhenPaused());
  });

  it('should allow owner to pause/unpause the contract', async function() {
    await pausable.pause();
    assert.equal(true, await pausable.paused());

    await pausable.unpause();
    assert.equal(false, await pausable.paused());
  });

  it('should not allow non owner to pause/unpause', async function() {
    await assertRevert(pausable.pause({from: accounts[1]}));
    await assertRevert(pausable.unpause({from:accounts[1]}));
  });

  it('should pause the function', async function() {
    await pausable.pause();

    await assertRevert(pausable.somePausableFunction());
    assert.equal(await pausable.counter(), 0);
  });

  it('should allow calling onlyWhenPuased when state is paused', async function() {
    await pausable.pause();
    await pausable.onlyWhenPaused();

    assert.equal(true, await pausable.somethingHappened());
  });

});
