let assertRevert = require('../helpers/assertRevert.js');

let CappedToken = artifacts.require('CappedToken');


contract('CappedToken', function(accounts) {
  let token;
  const cap = 1000;

  beforeEach('setup a new contract for each test', async function() {
    token = await CappedToken.new(cap);
  });

  it('should start with the correct cap', async function() {
    let result = await token.cap();

    assert.equal(result, cap);
  });

  it('should mint when amount is less or equal to cap', async function() {
    await token.mint(accounts[1], cap);

    let totalSupply = await token.totalSupply();
    assert.equal(totalSupply, cap);
  });

  it('should fail to mint if exceeds cap', async function() {
    await assertRevert(token.mint(accounts[1], cap+1));
  });

  it('should fail to mint after cap is reached', async function() {
    await token.mint(accounts[1], cap);
    await assertRevert(token.mint(accounts[2], 1));
  });

});
