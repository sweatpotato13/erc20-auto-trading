import Web3 from "web3";
import BigNumber from "bignumber.js";
import 'dotenv/config'
import fetch from "cross-fetch";

import abis from "../abis";
import addresses from "../addresses";


const web3 = new Web3(
    new Web3.providers.WebsocketProvider(process.env.INFURA_WSS)
);

const uniswapFactory = new web3.eth.Contract(
    abis.uniswapFactory.uniswapFactory,
    addresses.uniswapMainnet.factory
);
const uniswapRouter = new web3.eth.Contract(
    abis.uniswapRouter.uniswapRouter,
    addresses.uniswapMainnet.router
);

const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
const fromTokens = ['WETH'];
const fromToken = [
    '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' // WBNB
];
const fromTokenDecimals = [18];

const toTokens = ['SAITAMA'];
const toToken = [
    '0x8b3192f5eebd8579568a2ed41e6feb402f93f73f', // SAITAMA
];
const toTokenDecimals = [9];
const amount = process.env.AMOUNT;

async function main() {
    const networkId = await web3.eth.net.getId();
    console.log(`network ID is ${networkId}`);
    let subscription = web3.eth.subscribe('newBlockHeaders', (error, result) => {
        if (!error) {
            // console.log(result);
            return;
        }
        console.error(error);
    })
        .on("connected", subscriptionId => {
            console.log(`You are connected on ${subscriptionId}`);
        })
        .on('data', async block => {
            console.log('-------------------------------------------------------------');
            console.log(`New block received. Block # ${block.number}`);
            console.log(`GasLimit: ${block.gasLimit} and Timestamp: ${block.timestamp}`);

            const object = await fetch("https://cex.io/api/last_price/ETH/USD");
            const ethUsd = parseFloat((await object.json()).lprice);
            for (let j = 0; j < toTokens.length; j++) {
                console.log(`Trading ${fromTokens[0]}/${toTokens[j]} ...`);
                const pairAddress = await uniswapFactory.methods.getPair(fromToken[0], toToken[j]).call();
                console.log(`pairAddress ${fromTokens[0]}/${toTokens[j]} is ${pairAddress}`);

                const unit0 = await new BigNumber(amount);
                const amount0 = await new BigNumber(unit0).shiftedBy(fromTokenDecimals[0]);
                console.log(`Input amount of ${fromTokens[0]}: ${unit0.toString()}`);

                // The quote currency needs to be WBNB
                let tokenIn, tokenOut;
                if (fromToken[0] === WETH) {
                    tokenIn = fromToken[0];
                    tokenOut = toToken[j];
                } else if (toToken[j] === WETH) {
                    tokenIn = toToken[j];
                    tokenOut = fromToken[0];
                } else {
                    return;
                }

                // The quote currency is not WBNB
                if (typeof tokenIn === 'undefined') {
                    return;
                }

                // call getAmountsOut in PancakeSwap
                const amounts = await uniswapRouter.methods.getAmountsOut(amount0, [tokenIn, tokenOut]).call();
                const unit1 = await new BigNumber(amounts[1]).shiftedBy(-toTokenDecimals[j]);
                const amount1 = await new BigNumber(amounts[1]);
                console.log(`
                    Buying token at UniSwap DEX
                    =================
                    tokenIn: ${unit0.toString()} ${fromTokens[0]}
                    tokenOut: ${unit1.toString()} ${toTokens[j]}
                `);
                const price = parseFloat(unit0.toString()) * ethUsd / parseFloat(unit1.toString());
                console.log(`${toTokens[j]} price : $${price}`);
            }
        })
        .on('error', error => {
            console.log(error);
        });
}

main();