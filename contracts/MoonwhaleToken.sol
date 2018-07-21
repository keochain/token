pragma solidity 0.4.24;
import "openzeppelin-solidity/contracts/access/Whitelist.sol";
import "openzeppelin-solidity/contracts/lifecycle/Pausable.sol";


contract MoonwhaleToken is StandardToken, Whitelist {
  string public constant name = "Moonwhale";
  string public constant symbol = "XMM";
  uint8 public constant decimals = 18;
  uint256 public constant INITIAL_SUPPLY = 1000000000 * (10 ** uint256(decimals));

  uint256 public constant TOKENS_MINTED_PER_DAY = 30000 * (10 ** uint256(decimals));
  uint256 public tokensWithdrawn = 0;
  uint256 public creationTime;
  address public gameficationWallet;
  event Mint(address indexed to, uint256 amount);

  constructor(address _gameficationWallet) public {
    require(_gameficationWallet != address(0));
    creationTime = now;
    gameficationWallet = _gameficationWallet;
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

  function numTokensMinted() public constant returns(uint256){
    uint256 diff = now - creationTime;
    uint totalMinted = diff.mul(TOKENS_MINTED_PER_DAY).div(1 days);
    return totalMinted;
  }

  function mintToGameficationWallet() public whenNotPaused onlyIfWhitelisted(msg.sender) {
    uint totalMinted = numTokensMinted();
    uint tokensToSend = totalMinted.sub(tokensWithdrawn);
    if(tokensToSend > 0) {
      mint(gameficationWallet, tokensToSend);
      tokensWithdrawn = tokensWithdrawn.add(tokensToSend);
    }
  }


  function changeGamificationWallet(address _newWallet) public whenNotPaused onlyIfWhitelisted(msg.sender) {
    require(_newWallet != address(0));
    gameficationWallet = _newWallet;
  }

  function transferFrom(address _from, address _to, uint256 _value) public whenNotPaused returns (bool) {
    return super.transferFrom(_from, _to, _value);
  }

  function approve(address _spender, uint256 _value) public whenNotPaused returns (bool) {
    return super.approve(_spender, _value);
  }


  function increaseApproval(address _spender,uint256 _addedValue) public whenNotPaused returns(bool) {
    return super.increaseApproval(_spender, _addedValue);
  }

  function decreaseApproval(address _spender, uint256 _subtractedValue) public whenNotPaused returns (bool) {
    return super.decreaseApproval(_spender, _subtractedValue);
  }

  function transfer(address _to, uint256 _value) public whenNotPaused returns (bool) {
    return super.transfer(_to, _value);
  }

}
