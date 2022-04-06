// SPDX-License-Identifier: UNLICENSED

pragma solidity >=0.6.6 <0.8.0;

import './utils/Ownable.sol';
import './utils/SafeMath.sol';
import './UniswapV2Library.sol';
import './interfaces/IERC20.sol';
import './interfaces/IUniswapV2Pair.sol';
import './interfaces/IUniswapV2Factory.sol';
import './interfaces/IUniswapV2Router02.sol';

contract Swapcontract is Ownable {
    using SafeMath for uint;
    address private constant uniswapRouter = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address private constant WETH = 0xc778417E063141139Fce010982780140Aa0cD5Ab;

    constructor() {}

    function startSwap(
        address token0,
        address token1,
        uint amount0,
        uint amount1
    ) external {
        // transfer input tokens to this contract address
        IERC20(token0).transferFrom(msg.sender, address(this), amount0);
        // approve uniswapRouter to transfer tokens from this contract
        IERC20(token0).approve(uniswapRouter, amount0);

        address[] memory path;
        if (token0 == WETH || token1 == WETH) {
            path = new address[](2);
            path[0] = token0;
            path[1] = token1;
        } else {
            path = new address[](3);
            path[0] = token0;
            path[1] = WETH;
            path[2] = token1;
        }

        IUniswapV2Router02(uniswapRouter).swapExactTokensForTokens(
            amount0,
            amount1,
            path,
            msg.sender,
            block.timestamp
        );
    }

    function destruct() public onlyOwner {
        address payable owner = payable(owner());
        selfdestruct(owner);
    }

    receive() external payable {}
}

