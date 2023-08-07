let assertRevert = require(__dirname + '/helpers/assertRevert.js');

let Ownable = artifacts.require('Ownable');


contract('Ownable', function(accounts) {
  let ownable;

  beforeEach('setup a new contract for each test', async function() {
    ownable = await Ownable.new({from: accounts[0]});
  });

  it('has an owner', async function() {
    assert.equal(await ownable.owner(), accounts[0]);
  });

  it('should change owner after transfership', async function() {
    const newOwner = accounts[1];
    await ownable.transferOwnership(address=newOwner, {from: accounts[0]});
    assert.equal(await ownable.owner(), newOwner)
  });

  it('should prevent others to transfer ownership', async function() {
    const newOwner = accounts[1];
    await assertRevert(ownable.transferOwnership(address=newOwner, {from: newOwner}));
  });

  it('should guard from stuck state', async function() {
    await assertRevert(ownable.transferOwnership(null, {from: accounts[0]}));
  });

  it('should send OwnershipTransferred event with correct parameters', async function() {
    const newOwner = accounts[1];

    let eventWatcher = ownable.OwnershipTransferred();

    await ownable.transferOwnership(newOwner, {from: accounts[0]});

    // fetch the events
    let events = await eventWatcher.get()

    // Test that we've got only one event and that it was the correct one
    assert.equal(events.length, 1);
    assert.equal(events[0].event, 'OwnershipTransferred');
    assert.equal(events[0].args.previousOwner, accounts[0]);
    assert.equal(events[0].args.newOwner, newOwner);
  });

});
