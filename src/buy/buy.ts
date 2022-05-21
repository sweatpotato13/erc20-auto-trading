import Web3 from "web3";
import BigNumber from "bignumber.js";
import 'dotenv/config'
import fetch from "cross-fetch";
import csv from "csvtojson";

import abis from "../../abis";
import addresses from "../../addresses";

const web3 = new Web3(
    new Web3.providers.WebsocketProvider(process.env.INFURA_WSS2 as string)
);

const uniswapFactory = new web3.eth.Contract(
    abis.uniswapFactory.uniswapFactory,
    addresses.uniswapMainnet.factory
);
const uniswapRouter = new web3.eth.Contract(
    abis.uniswapRouter.uniswapRouter,
    addresses.uniswapMainnet.router
);

const { address: admin } = web3.eth.accounts.wallet.add(process.env.PRIVATE_KEY);
let wethToken;
let targetTokens;
let flag = [];

async function setUp() {
    wethToken = await csv().fromFile(process.env.WETH_TOKEN_CSV_PATH);
    targetTokens = await csv().fromFile(process.env.BUY_TARGET_TOKEN_CSV_PATH);
    for(let i = 0;i<targetTokens.length;i++){
        flag.push(false);
    }
}

const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
async function main() {
    let nonce = await web3.eth.getTransactionCount(admin);

    const networkId = await web3.eth.net.getId();
    console.log(`network ID is ${networkId}`);
    let subscription = web3.eth.subscribe('newBlockHeaders', (error, result) => {
        if (!error) {
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
            for (let j = 0; j < targetTokens.length; j++) {
                console.log(`Trading ${wethToken[0].tokenName}/${targetTokens[j].tokenName} ...`);
                const pairAddress = await uniswapFactory.methods.getPair(wethToken[0].tokenContract, targetTokens[j].tokenContract).call();
                console.log(`pairAddress ${wethToken[0].tokenName}/${targetTokens[j].tokenName} is ${pairAddress}`);
                const uniswapPair = new web3.eth.Contract(
                    abis.uniswapPair.uniswapPair,
                    pairAddress
                );

                const unit0 = await new BigNumber(wethToken[0].amount);
                const amount0 = await new BigNumber(unit0).shiftedBy(parseInt(wethToken[0].decimals));
                console.log(`Input amount of ${wethToken[0].tokenName}: ${unit0.toString()}`);

                const reserve = await uniswapPair.methods.getReserves().call();
                const token0 = await uniswapPair.methods.token0().call();
                let unit00, unit11;
                if (token0 === WETH) {
                    unit00 = await new BigNumber(reserve._reserve0)
                    unit11 = await new BigNumber(reserve._reserve1)
                }
                else {
                    unit00 = await new BigNumber(reserve._reserve1)
                    unit11 = await new BigNumber(reserve._reserve0)
                }

                // The quote currency needs to be WETH
                let tokenIn, tokenOut;
                if (wethToken[0].tokenContract === WETH) {
                    tokenIn = wethToken[0].tokenContract;
                    tokenOut = targetTokens[j].tokenContract;
                } else if (targetTokens[j].tokenContract === WETH) {
                    tokenIn = targetTokens[j].tokenContract;
                    tokenOut = wethToken[0].tokenContract;
                } else {
                    return;
                }

                // The quote currency is not WETH
                if (typeof tokenIn === 'undefined') {
                    return;
                }

                const amounts = await uniswapRouter.methods.getAmountsOut(amount0, [tokenIn, tokenOut]).call();
                const unit1 = await new BigNumber(amounts[1]).shiftedBy(-parseInt(targetTokens[j].decimals));
                const amount1 = await new BigNumber(amounts[1]);
                console.log(`
                    Buying token at UniSwap DEX
                    =================
                    tokenIn: ${unit0.toString()} ${wethToken[0].tokenName}
                    tokenOut: ${unit1.toString()} ${targetTokens[j].tokenName}
                `);
                const price = parseFloat(unit00.toString()) * ethUsd / parseFloat(unit11.toString()) / Math.pow(10, 18 - parseInt(targetTokens[j].decimals));
                console.log(`${targetTokens[j].tokenName} price : $${price}`);
                if (!flag[j] && price < parseFloat(targetTokens[j].threshold)) {
                    console.log(`Price is lower than expected. Try to buy (expected: ${targetTokens[j].threshold})`);
                    // nonce = await web3.eth.getTransactionCount(admin);
                    // const deadline = Math.floor(Date.now() / 1000) + 60 * 10;
                    // const tx = uniswapRouter.methods.swapExactETHForTokens(
                    //     amount1,
                    //     [WETH, toToken[j]],
                    //     process.env.WALLET_ADDRESS as string,
                    //     deadline
                    // )
                    // const data = tx.encodeABI();
                    // const txData = {
                    //     gasLimit: 244155,
                    //     gas: gasPrice,
                    //     from: admin,
                    //     to: addresses.uniswapMainnet.router,
                    //     data,
                    //     nonce: nonce,
                    //     value: await web3.utils.toWei(amount[j], 'ether')
                    // }
                    // try {
                    //     console.log(`[${block.number}] [${new Date().toLocaleString()}] : sending transactions...`, JSON.stringify(txData))
                    //     flag[j] = true;
                    //     const receipt = await web3.eth.sendTransaction(txData);
                    //     console.log(receipt);
                    // } catch (e) {
                    //     console.error('transaction error', e);
                    // }
                }
                else {
                    console.log(`Price is higher than expected. (expected: ${targetTokens[j].threshold})`);
                }
            }
        })
        .on('error', error => {
            console.log(error);
        });
}

setUp()
main();
