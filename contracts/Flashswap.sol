// SPDX-License-Identifier: UNLICENSED

pragma solidity >=0.6.6 <0.8.0;

import "./utils/SafeMath.sol";
import "./UniswapV2Library.sol";
import "./interfaces/IERC20.sol";
import "./interfaces/IUniswapV2Pair.sol";
import "./interfaces/IUniswapV2Factory.sol";
import "./interfaces/IUniswapV2Router02.sol";

contract Flashswap {
    using SafeMath for uint256;

    address private owner;
    address private constant uniswapFactory =
        0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f;
    IUniswapV2Router02 apeRouter = IUniswapV2Router02(uniswapFactory);

    constructor() {
        owner = msg.sender;
    }

    function startArbitrage(
        address token0,
        address token1,
        uint256 amount0,
        uint256 amount1
    ) external {
        address pairAddress = IUniswapV2Factory(uniswapFactory).getPair(
            token0,
            token1
        );
        require(pairAddress != address(0), "This pool does not exist");

        IUniswapV2Pair(pairAddress).swap(
            amount0,
            amount1,
            address(this),
            bytes("not empty")
        );
    }

    // function uniswapCall(
    //     address _sender,
    //     uint256 _amount0,
    //     uint256 _amount1,
    //     bytes calldata _data
    // ) external {
    //     address[] memory path = new address[](2);

    //     // obtain an amout of token that you exchanged
    //     uint256 amountToken = _amount0 == 0 ? _amount1 : _amount0;

    //     address token0 = IUniswapV2Pair(msg.sender).token0();
    //     address token1 = IUniswapV2Pair(msg.sender).token1();

    //     require(
    //         msg.sender ==
    //             UniswapV2Library.pairFor(uniswapFactory, token0, token1)
    //     );
    //     require(_amount0 == 0 || _amount1 == 0);

    //     // if _amount0 is zero sell token1 for token0
    //     // else sell token0 for token1 as a result
    //     path[0] = _amount0 == 0 ? token1 : token0;
    //     path[1] = _amount0 == 0 ? token0 : token1;

    //     // IERC20 token that we will sell for otherToken
    //     IERC20 token = IERC20(_amount0 == 0 ? token1 : token0);
    //     // token.approve(address(bakeryRouter), amountToken);
    //     token.approve(address(apeRouter), amountToken);

    //     // calculate the amount of token how much input token should be reimbursed
    //     uint256 amountRequired = UniswapV2Library.getAmountsIn(
    //         uniswapFactory,
    //         amountToken,
    //         path
    //     )[0];

    //     // swap token and obtain equivalent otherToken amountRequired as a result
    //     // need to receive amountRequired at minimum amount to pay back
    //     // uint amountReceived = bakeryRouter.swapExactTokensForTokens(
    //     uint256 amountReceived = apeRouter.swapExactTokensForTokens(
    //         amountToken,
    //         amountRequired,
    //         path,
    //         msg.sender,
    //         block.timestamp
    //     )[1];

    //     require(amountReceived > amountRequired); // fail if we didn't get enough tokens
    //     IERC20 otherToken = IERC20(_amount0 == 0 ? token0 : token1);
    //     otherToken.transfer(msg.sender, amountRequired);
    //     otherToken.transfer(owner, amountReceived.sub(amountRequired));
    // }

    receive() external payable {}
}
