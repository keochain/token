#!/bin/bash
# Flattens the Vibeo token contract.
/usr/local/share/dotnet/dotnet "../SolidityFlattener/bin/Debug/netcoreapp2.1/SolidityFlattener.dll" "contracts/KeochainToken.sol" "contracts/KeochainTokenFlattened.sol" ".,../node_modules"
echo "Success!"