const Token = artifacts.require('MoonsToken');
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
      const creationTime = latestTime();
      const INITIAL_SUPPLY = ether(1000000000); //1 B * 10^18
      const tokensMintedPerDay = ether(30000); // 30000 * 10^18
      assert((await token.name()) === 'Moons');
      assert((await token.decimals()).toString() === '18');
      assert((await token.gamificationWallet()) === gamificationWallet);
      assert((await token.creationTime()).toNumber() === creationTime);
      (await token.GAMIFICATION_TOKEN_ALLOCATION_PER_DAY()).should.be.bignumber.equal(tokensMintedPerDay);
      assert((await token.symbol()) === 'XMM');
      (await token.INITIAL_SUPPLY()).should.be.bignumber.equal(INITIAL_SUPPLY);
      const initialBalance = await token.balanceOf(owner);
      initialBalance.should.be.bignumber.equal(INITIAL_SUPPLY);
      const isWhitelisted = await token.hasRole(owner, "whitelist");
      assert(isWhitelisted);
      assert((await token.totalMinted()).toString() === '0');
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
    })

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
      let totalMinted =  await token.totalMinted();
      totalMinted.should.be.bignumber.equal(balance);
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
  })
  describe('Burn tokens', async () => {

    let token;
    beforeEach(async () => {
      token = await Token.new(accounts[1]);
      await token.transfer(accounts[2], 10);
    })

    it('should revert if burn is called by non-whitelisted', async () => {
      await token.burn(1, {from: accounts[2]}).should.be.rejectedWith(EVMRevert);
    });

    it('burn should reduce the total supply', async () => {
      await token.addAddressToWhitelist(accounts[2]);
      let totalSupply = await token.totalSupply();
      await token.burn(1, {from: accounts[2]});
      (await token.totalSupply()).should.be.bignumber.equal(totalSupply.sub(1));
    });

    it('burn should reduce the balance', async () => {
      await token.addAddressToWhitelist(accounts[2]);
      let balance = await token.balanceOf(accounts[2]);
      await token.burn(1, {from: accounts[2]});
      (await token.balanceOf(accounts[2])).should.be.bignumber.equal(balance.sub(1));
    });

  })
});
