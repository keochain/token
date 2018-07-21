pragma solidity 0.4.24;
import "openzeppelin-solidity/contracts/token/ERC20/StandardBurnableToken.sol";
import "openzeppelin-solidity/contracts/access/Whitelist.sol";

contract MoonwhaleToken is StandardBurnableToken, Whitelist {
  string public constant name = "Moonwhale";
  string public constant symbol = "XMM";
  uint8 public constant decimals = 18;
  uint256 public creationTime;
  address public gameficationWallet;
  uint256 public constant TOKENS_MINTED_PER_DAY = 30000 * (10 ** uint256(decimals));
  uint256 public tokensWithdrawn = 0;
  event Mint(address indexed to, uint256 amount);

  constructor(address _gameficationWallet) public {
    require(_gameficationWallet != address(0));
    creationTime = now;
    gameficationWallet = _gameficationWallet;
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

  function mintToGameficationWallet() public onlyIfWhitelisted(msg.sender) {
    uint totalMinted = numTokensMinted();
    uint tokensToSend = totalMinted.sub(tokensWithdrawn);
    if(tokensToSend > 0) {
      mint(gameficationWallet, tokensToSend);
      tokensWithdrawn = tokensWithdrawn.add(tokensToSend);
    }
  }


  function changeGamificationWallet(address _newWallet) public onlyIfWhitelisted(msg.sender) {
    require(_newWallet != address(0));
    gameficationWallet = _newWallet;
  }

}
