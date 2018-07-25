/*
Copyright 2017 Moonwhale

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
 */

pragma solidity 0.4.24;
import "openzeppelin-solidity/contracts/access/Whitelist.sol";
import "openzeppelin-solidity/contracts/token/ERC20/StandardToken.sol";
import "openzeppelin-solidity/contracts/lifecycle/Pausable.sol";
import "openzeppelin-solidity/contracts/ownership/CanReclaimToken.sol";
import "openzeppelin-solidity/contracts/token/ERC20/BurnableToken.sol";

///@title Moons Token
///@author http://moonwhale.io
///@notice Moons is the utility token of the Moonwhale ecosystem. 
///Moons will be distributed through a public ICO. A small portion of
///Moons will be distributed for free for gamification purposes, rewarding a long-term investor
///mindset and engagement in the Moonwhale App.
///Moonwhale provides gamification of crypto investments to
///reward long term thinking and provide benchmarks along the way. Holding crypto assets long
///term requires patience and endurance. It’s easy to fall into traps when there are pumps or dips.
///With gamification users can both be educated about the upsides of staying out of the game of
///quick returns and provided some of the same emotional thrills that trading gives.
contract MoonsToken is StandardToken, BurnableToken, Whitelist, Pausable, CanReclaimToken {
  string public constant name = "Moons";
  string public constant symbol = "XMM";
  uint8 public constant decimals = 18;
  uint256 public constant INITIAL_SUPPLY = 1000000000 * (10 ** uint256(decimals));

  uint256 public constant TOKENS_MINTED_PER_DAY = 30000 * (10 ** uint256(decimals));
  uint256 public gamificationTokensWithdrawn = 0;
  uint256 public creationTime;
  address public gamificationWallet;

  event Mint(address indexed to, uint256 amount);

  ///@param	_gamificationWallet The wallet address used for the gamification feature.
  constructor(address _gamificationWallet) public {
    require(_gamificationWallet != address(0));
    creationTime = now;
    gamificationWallet = _gamificationWallet;
    totalSupply_ = INITIAL_SUPPLY;
    balances[msg.sender] = INITIAL_SUPPLY;
    emit Transfer(address(0), msg.sender, INITIAL_SUPPLY);
    super.addAddressToWhitelist(msg.sender);
  }

  function mint(address _to, uint256 _amount) internal {
    totalSupply_ = totalSupply_.add(_amount);
    balances[_to] = balances[_to].add(_amount);
    emit Mint(_to, _amount);
  }

  ///@return The total number of tokens that should have been minted by the gamification engine.
  function getMintingSupply() public constant returns(uint256){
    uint256 diff = now - creationTime;
    uint supply = diff.div(1 days).mul(TOKENS_MINTED_PER_DAY);
    return supply;
  }

  ///@notice Mint tokens for gamification engine.
  ///Every day, 30 000 new Moons are minted for gamification purposes, currently equalling
  ///3 Million Stars. They are distributed to active users as rewards in the gamification
  ///engine. Any remaining Stars at the end of a month will be kept available for the next
  ///month. The minting of new tokens amounts to an inflation of around 1% per annum.
  function mint() public whenNotPaused onlyIfWhitelisted(msg.sender) {
    uint mintingSupply = getMintingSupply();
    uint remainingTokens = mintingSupply.sub(gamificationTokensWithdrawn);

    if(remainingTokens > 0) {
      mint(gamificationWallet, remainingTokens);
      gamificationTokensWithdrawn = gamificationTokensWithdrawn.add(remainingTokens);
    }
  }

  ///@notice Changes the destination wallet address of the gamification engine to receive the minted coins.
  ///@param _newWallet The address of the new gamification wallet to set.
  ///@dev Can only be performed by the whitelist.
  function changeGamificationWallet(address _newWallet) public whenNotPaused onlyIfWhitelisted(msg.sender) {
    require(_newWallet != address(0));
    require(_newWallet != gamificationWallet);

    gamificationWallet = _newWallet;
  }

  ///@dev This function is overriden to leverage Pausable feature.
  function transferFrom(address _from, address _to, uint256 _value) public whenNotPaused returns (bool) {
    return super.transferFrom(_from, _to, _value);
  }

  ///@dev This function is overriden to leverage Pausable feature.
  function approve(address _spender, uint256 _value) public whenNotPaused returns (bool) {
    return super.approve(_spender, _value);
  }


  ///@dev This function is overriden to leverage Pausable feature.
  function increaseApproval(address _spender,uint256 _addedValue) public whenNotPaused returns(bool) {
    return super.increaseApproval(_spender, _addedValue);
  }

  ///@dev This function is overriden to leverage Pausable feature.
  function decreaseApproval(address _spender, uint256 _subtractedValue) public whenNotPaused returns (bool) {
    return super.decreaseApproval(_spender, _subtractedValue);
  }

  ///@dev This function is overriden to leverage Pausable feature.
  function transfer(address _to, uint256 _value) public whenNotPaused returns (bool) {
    return super.transfer(_to, _value);
  }

  ///@notice Burns the coins held by the sender if they are in the whitelist.
  ///@dev This function is overriden to leverage Pausable feature.
  function burn(uint _value) public whenNotPaused onlyIfWhitelisted(msg.sender) {
    super.burn(_value);
  }
}