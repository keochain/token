/*
Copyright 2018 Moonwhale

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
import "openzeppelin-solidity/contracts/token/ERC20/StandardToken.sol";
import "./CustomPausable.sol";
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
contract MoonsToken is CustomPausable, StandardToken, BurnableToken, CanReclaimToken {
  string public constant name = "Moons";
  string public constant symbol = "XMM";
  uint8 public constant decimals = 18;
  uint256 public constant INITIAL_SUPPLY = 1000000000 * (10 ** uint256(decimals));

  uint256 public constant GAMIFICATION_TOKEN_ALLOCATION_PER_DAY = 30000 * (10 ** uint256(decimals));
  uint256 public totalMinted = 0;
  uint256 public creationTime;
  address public gamificationWallet;



  event Mint(address indexed to, uint256 amount);

  ///@param	_gamificationWallet The wallet address used for the gamification feature.
  ///@dev Set "creationTime" as a constant during deployment and remove this comment.
  constructor(address _gamificationWallet) public {
    require(_gamificationWallet != address(0));
    require(_gamificationWallet != msg.sender);
    creationTime = now;
    gamificationWallet = _gamificationWallet;
    totalSupply_ = INITIAL_SUPPLY;
    balances[msg.sender] = INITIAL_SUPPLY;
    emit Transfer(address(0), msg.sender, INITIAL_SUPPLY);
    super.addAddressToWhitelist(_gamificationWallet);
  }

  ///@notice Mints the specified amount of tokens.
  ///@param _to The address which will receive the minted tokens.
  ///@param _amount The amount of tokens to be minted.
  function mint(address _to, uint256 _amount) internal {
    totalSupply_ = totalSupply_.add(_amount);
    balances[_to] = balances[_to].add(_amount);

    emit Mint(_to, _amount);
  }

  ///@return The total number of tokens that should have been minted by the gamification engine.
  function getMintingSupply() public constant returns(uint256) {
    uint256 diff = now - creationTime;
    uint256 supply = diff.div(1 days).mul(GAMIFICATION_TOKEN_ALLOCATION_PER_DAY);
    return supply;
  }

  ///@notice Mints tokens for gamification engine.
  ///Every day, 30000 new Moons are minted for gamification purposes.
  ///They are distributed to active users as rewards in the gamification
  ///engine. The minting of new tokens amounts to an inflation of around 1.095% per annum
  ///based on the initial supply of 1 billion tokens.
  function mint() public whenNotPaused onlyWhitelisted {
    require(now > creationTime);

    uint256 mintingSupply = getMintingSupply();
    uint256 tokensToMint = mintingSupply.sub(totalMinted);

    if(tokensToMint > 0) {
      mint(gamificationWallet, tokensToMint);
      totalMinted = totalMinted.add(tokensToMint);
    }
  }

  ///@notice Changes the destination wallet address of the gamification engine to receive the minted coins.
  ///@param _newWallet The address of the new gamification wallet to set.
  ///@dev Can only be performed by the whitelist.
  function changeGamificationWallet(address _newWallet) public whenNotPaused onlyWhitelisted {
    require(_newWallet != address(0));
    require(_newWallet != gamificationWallet);
    gamificationWallet = _newWallet;
  }

  ///@dev This function is overriden to leverage Pausable feature.
  function transferFrom(address _from, address _to, uint256 _value) canTransfer(_from) public returns (bool) {
    return super.transferFrom(_from, _to, _value);
  }

  ///@dev This function is overriden to leverage Pausable feature.
  function approve(address _spender, uint256 _value) public canTransfer(msg.sender) returns (bool) {
    return super.approve(_spender, _value);
  }


  ///@dev This function is overriden to leverage Pausable feature.
  function increaseApproval(address _spender,uint256 _addedValue) public canTransfer(msg.sender) returns(bool) {
    return super.increaseApproval(_spender, _addedValue);
  }

  ///@dev This function is overriden to leverage Pausable feature.
  function decreaseApproval(address _spender, uint256 _subtractedValue) public canTransfer(msg.sender) whenNotPaused returns (bool) {
    return super.decreaseApproval(_spender, _subtractedValue);
  }

  ///@dev This function is overriden to leverage Pausable feature.
  function transfer(address _to, uint256 _value) public canTransfer(msg.sender) returns (bool) {
    return super.transfer(_to, _value);
  }

  function sumOf(uint256[] values) private pure returns(uint256) {
    uint256 total = 0;
    for (uint256 i = 0; i < values.length; i++) {
      total = total.add(values[i]);
    }
    return total;
  }

  function bulkTransfer(address[] destinations, uint256[] amounts) onlyWhitelisted public {
    uint256 requiredBalance = sumOf(amounts);
    require(destinations.length == amounts.length);
    require(balances[msg.sender] >= requiredBalance);
    for (uint256 i = 0; i < destinations.length; i++) {
     transfer(destinations[i], amounts[i]);
   }
 }

  ///@notice Burns the coins held by the sender.
  ///@param _value The amount of coins to burn.
  ///@dev This function is overriden to leverage Pausable feature.
  function burn(uint256 _value) public whenNotPaused onlyWhitelisted {
    super.burn(_value);
  }

  ///@notice Disallows incoming transactions to this contract address.
  function() external {
    revert("This action is not supported.");
  }
}
