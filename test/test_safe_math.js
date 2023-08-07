let assertRevert = require(__dirname + '/helpers/assertRevert.js');
let assertJump = require(__dirname + '/helpers/assertJump.js');

var SafeMathMock = artifacts.require('SafeMathMock');


contract('SafeMathMock', function(accounts) {
  let safeMath;

  before(async function() {
    safeMath = await SafeMathMock.new();
  });

  it('multiplies correclty', async function() {
    const a = 5678;
    const b = 1234;

    await safeMath.multiply(a, b);
    let result = await safeMath.result();

    assert.equal(result, a * b);
  });

  it('adds correctly', async function() {
    const a = 5678;
    const b = 1234;

    await safeMath.add(a, b);
    let result = await safeMath.result();

    assert.equal(result, a + b);
  });

  it('substracts correctly', async function() {
    const a = 5678;
    const b = 1234;

    await safeMath.subtract(a, b);
    let result = await safeMath.result();

    assert.equal(result, a - b);
  });

  it('should revert if subtraction results in negative number', async function() {
    const a = 5678;
    const b = 1234;

    try {
      await safeMath.subtract(b, a);
      assert.fail('should thrown before this');
    } catch (error) {
      assertJump(error);
    }
  });

  it('should throw an error on addition overflow', async function() {
    const a = 115792089237316195423570985008687907853269984665640564039457584007913129639935;
    const b = 1

    await assertRevert(safeMath.add(a, b));
  });

  it('should throw an error on multiplication overflow', async function() {
    let a = 115792089237316195423570985008687907853269984665640564039457584007913129639933;
    let b = 2;
    
    await assertRevert(safeMath.multiply(a, b));
  })


});
