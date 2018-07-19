pragma solidity 0.4.24;
import "openzeppelin-solidity/contracts/token/ERC20/StandardBurnableToken.sol";

contract MoonwhaleToken is StandardBurnableToken {
  string public constant name = "Moonwhale";
  string public constant symbol = "MOON";
  uint8 public constant decimals = 18;

  event Mint(address indexed to, uint256 amount);
  constructor() public {

  }

  function mint(
    address _to,
    uint256 _amount
  ) public {
    balances[_to] = balances[_to].add(_amount);
    totalSupply_ = totalSupply_.add(_amount);
  }
}
