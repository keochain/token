const Token = artifacts.require('KeochainToken');
import BigNumber  from 'bignumber.js';
import latestTime from './helpers/latestTime.js'
import ether from './helpers/ether.js';
import EVMRevert from './helpers/EVMRevert.js';
import {increaseTimeTo, duration} from './helpers/increaseTime'
var randomDays = Math.floor(Math.random() * (100000 - 100 + 1)) + 100;

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

contract('Token', async function(accounts) {
  describe('Token Creation', async () => {
    it('should deploy with correct parameters', async () => {
      const gamificationWallet = accounts[1];
      const owner = accounts[0];
      const token = await Token.new(gamificationWallet);

      const INITIAL_SUPPLY = ether(1000000000); //1 B * 10^18
      const tokensMintedPerDay = ether(30000); // 30000 * 10^18
      assert((await token.name()) === 'Keochain');
      assert((await token.decimals()).toString() === '18');
      assert((await token.gamificationWallet()) === gamificationWallet);

      (await token.GAMIFICATION_TOKEN_ALLOCATION_PER_DAY()).should.be.bignumber.equal(tokensMintedPerDay);
      assert((await token.symbol()) === 'KEO');
      (await token.INITIAL_SUPPLY()).should.be.bignumber.equal(INITIAL_SUPPLY);
      const initialBalance = await token.balanceOf(owner);
      initialBalance.should.be.bignumber.equal(INITIAL_SUPPLY);
      const isWhitelisted = await token.whitelist(owner);
      assert(isWhitelisted);
      assert((await token.totalRewarded()).toString() === '0');
      assert((await token.owner()) === owner);
    });
  });

  describe('check num of tokens minted', async ()  => {
    let token;
    let tokensMintedPerDay;
    let gamificationWallet = accounts[1];
    beforeEach(async () => {
      token = await Token.new(gamificationWallet);
      tokensMintedPerDay = await token.GAMIFICATION_TOKEN_ALLOCATION_PER_DAY()
    });

    it('should mint 30000 tokens after day 1', async () => {
      const currentTime = latestTime();
      await increaseTimeTo(currentTime + duration.days(1));
      const numOfTokensMinted = await token.getMintingSupply();
      numOfTokensMinted.should.be.bignumber.equal(tokensMintedPerDay);
    });

    it('should mint 60000 tokens after day 2', async () => {
      const currentTime = latestTime();
      await increaseTimeTo(currentTime + duration.days(2));
      const numOfTokensMinted = await token.getMintingSupply();
      numOfTokensMinted.should.be.bignumber.equal(tokensMintedPerDay.mul(2));
    });

    it('should mint 60000 tokens after 2 days and 30 minutes', async () => {
      const currentTime = latestTime();
      await increaseTimeTo(currentTime + duration.days(2) + duration.minutes(30));
      const numOfTokensMinted = await token.getMintingSupply();
      numOfTokensMinted.should.be.bignumber.equal(tokensMintedPerDay.mul(2));
    });
  });

  describe('mint tokens to gamificationWallet', async ()  => {
    let token;
    let tokensMintedPerDay;
    let gamificationWallet = accounts[1];

    beforeEach(async () => {
      token = await Token.new(gamificationWallet);
      tokensMintedPerDay = await token.GAMIFICATION_TOKEN_ALLOCATION_PER_DAY()
    });

    it('should mint 30000 tokens to gamificationWallet', async () => {
      const currentTime = latestTime();
      await increaseTimeTo(currentTime + duration.days(1));
      const numOfTokensMinted = await token.getMintingSupply();
      await token.mint();
      let balance = await token.balanceOf(gamificationWallet);
      balance.should.be.bignumber.equal(numOfTokensMinted);
      let totalRewarded =  await token.totalRewarded();
      totalRewarded.should.be.bignumber.equal(balance);
    });


    it('should mint 60000 tokens to gamificationWallet', async () => {
      let currentTime = latestTime();
      await increaseTimeTo(currentTime + duration.days(1));
      await token.mint();
      currentTime = latestTime();
      await increaseTimeTo(currentTime + duration.days(1) );
      await token.mint();
      let balance = await token.balanceOf(gamificationWallet);
      balance.should.be.bignumber.equal(tokensMintedPerDay.mul(2));
    });

    it('should mint the correct amount of tokens ' + (30000 * randomDays) + 'XMM to gamificationWallet for ' + randomDays + ' days', async () => {
      let currentTime = latestTime();

      await increaseTimeTo(currentTime + duration.days(randomDays));
      await token.mint();
      let balance = await token.balanceOf(gamificationWallet);

      balance.should.be.bignumber.equal(tokensMintedPerDay.mul(randomDays));
    });

    it('minting more than once on the same day should not send any tokens', async () => {
      let currentTime = latestTime();
      await increaseTimeTo(currentTime + duration.days(1));
      await token.mint();
      let balance = await token.balanceOf(gamificationWallet);
      balance.should.be.bignumber.equal(tokensMintedPerDay);

      await token.mint();
      balance = await token.balanceOf(gamificationWallet);
      balance.should.be.bignumber.equal(tokensMintedPerDay);

      await token.mint();
      balance = await token.balanceOf(gamificationWallet);
      balance.should.be.bignumber.equal(tokensMintedPerDay);
    });

    it('should not mint any tokens if token is less than a day old', async () => {
      let currentTime = latestTime();
      await increaseTimeTo(currentTime + duration.minutes(1));

      await token.mint();
      let balance = await token.balanceOf(gamificationWallet);
      assert(balance.toNumber() === 0);
    });

    it('mint function can be called only by a whitelist', async () => {
      await token.mint({ from: accounts[2] })
      .should.be.rejectedWith(EVMRevert);
    });

    it('mint should increase the totalSupply', async () => {
      let totalSupply = await token.totalSupply();
      let currentTime = latestTime();
      await increaseTimeTo(currentTime + duration.days(1));
      await token.mint();
      (await token.totalSupply())
      .should.be.bignumber.equal(totalSupply.add(tokensMintedPerDay))
    });
  });

  describe('Pausable', async () => {
    let token;

    beforeEach(async () => {
      token = await Token.new(accounts[4]);
    });

    it('onlyWhitelisted addresses can pause', async () => {
      await token.pause().should.be.fulfilled;
      await token.pause({ from: accounts[3] }).should.be.rejectedWith(EVMRevert);
    });
  });

  describe('ERC20 functions when Paused', async () => {
    let token;
    beforeEach(async () => {
      token = await Token.new(accounts[4]);
      await token.addAddressToWhitelist(accounts[2]);
      await token.addAddressToWhitelist(accounts[3]);
      await token.transfer(accounts[1], 100)
      await token.pause();
    });

    it('non whitelisted addresses cannot transfer when paused', async () => {
      await token.transfer(accounts[3], 10);
      await token.transfer(accounts[2], 5, { from: accounts[2] })
      .should.be.rejectedWith(EVMRevert);
    });

    it('non whitelisted addresses cannot approve when paused', async () => {
      await token.approve(accounts[2], 10, { from: accounts[1] })
      .should.be.rejectedWith(EVMRevert);
    });

    it('non whitelisted addresses cannot transferFrom when paused', async () => {
      await token.unpause();
      await token.transfer(accounts[2], 100);
      await token.approve(accounts[3], 10, {from: accounts[2]})
      await token.pause();
      await token.transferFrom(accounts[2], accounts[5], 1, {from: accounts[2] })
      .should.be.rejectedWith(EVMRevert);
    });

    it('non whitelisted address cannot increase Approval when paused', async () => {
      await token.unpause();
      await token.transfer(accounts[5], 100);
      await token.pause();
      await token.increaseApproval(accounts[3], 10, {from: accounts[5]})
      .should.be.rejectedWith(EVMRevert);
    });

    it('non whitelisted address cannot decrease Approval when paused', async () => {
      await token.unpause();
      await token.transfer(accounts[2], 100);
      await token.approve(accounts[3], 10, {from: accounts[2]})
      await token.pause();
      await token.decreaseApproval(accounts[3], 5, {from: accounts[2]})
      .should.be.rejectedWith(EVMRevert);
    });

    it('only a whitelisted address can transfer when token is paused', async() => {
      await token.unpause();
      await token.pause();
      await token.transfer(accounts[3], 2);
      const balance = await token.balanceOf(accounts[3]);
      assert(balance.toNumber() == 2);
    });

    it('non-whitelisted address should not transfer when transfer lock is enabled', async() => {

      await token.transfer(accounts[5], 2);
      assert((await token.released()) == false);
      await token.unpause();
      await token.transfer(accounts[6], 2, {from: accounts[5]}).should.be.rejectedWith(EVMRevert);
      await token.releaseTokenTransfer()
      await token.transfer(accounts[6], 2, {from: accounts[5]});
      const balance = await token.balanceOf(accounts[6]);
      assert(balance.toNumber() == 2);
    })
  });

  describe('Burn tokens', async () => {
    let token;
    beforeEach(async () => {
      token = await Token.new(accounts[1]);
      await token.addAddressToWhitelist(accounts[2]);
      await token.transfer(accounts[2], 10);
    });

    it('burn should reduce the total supply', async () => {
      let totalSupply = await token.totalSupply();
      await token.burn(1, {from: accounts[2]});
      (await token.totalSupply()).should.be.bignumber.equal(totalSupply.sub(1));
    });

    it('burn should reduce the balance', async () => {
      let balance = await token.balanceOf(accounts[2]);
      await token.burn(1, {from: accounts[2]});
      (await token.balanceOf(accounts[2])).should.be.bignumber.equal(balance.sub(1));
    });

    it('non whitelisted addresses cannot burn tokens', async () => {
      await token.transfer(accounts[3], 10);
      await token.burn(1, {from: accounts[3]})
      .should.be.rejectedWith(EVMRevert);
    });
  });

  describe('Bulk token transfer', async () => {
    let token;
    beforeEach(async () => {
      token = await Token.new(accounts[5]);
      await token.addAddressToWhitelist(accounts[2]);
    });

    it('should bulk transfer', async () => {
      const balances = [];
      const destinations = [];

      for(let i=1;i<4;i++) {
        destinations.push(accounts[i]);
        balances.push(i);
      };

      await token.bulkTransfer(destinations, balances);

      for(let i=0;i<destinations.length;i++) {
        let balance = await token.balanceOf(destinations[i]);
        assert(balance.toNumber() == balances[i]);
      };
    });

    it('non-whitelisted addresses cannot call bulk transfer', async () => {
      const balances = [];
      const destinations = [];

      for(let i=1;i<4;i++) {
        destinations.push(accounts[i]);
        balances.push(i);
      };

      await token.bulkTransfer(destinations, balances, { from: accounts[1] })
      .should.be.rejectedWith(EVMRevert);
    });

    it('it should revert when the balance if less than the sum', async () => {
      const balances = [];
      const destinations = [];

      for(let i=1;i<4;i++) {
        destinations.push(accounts[i]);
        balances.push(i);
      };

      let currentBalance = await token.balanceOf(accounts[0]);
      await token.transfer(accounts[6], currentBalance);
      await token.bulkTransfer(destinations, balances, { from: accounts[0] })
      .should.be.rejectedWith(EVMRevert);
    });
  });
});
