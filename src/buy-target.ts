import Web3 from "web3";
import BigNumber from "bignumber.js";
import 'dotenv/config'
import fetch from "cross-fetch";

import abis from "../abis";
import addresses from "../addresses";
import Flashswap from "../build/contracts/Flashswap.json";


const web3 = new Web3(
    new Web3.providers.WebsocketProvider(process.env.INFURA_WSS as string)
);

const uniswapFactory = new web3.eth.Contract(
    abis.uniswapFactory.uniswapFactory,
    addresses.uniswapMainnet.factory
);
const uniswapRouter = new web3.eth.Contract(
    abis.uniswapRouter.uniswapRouter,
    addresses.uniswapMainnet.router
);

const flashswap = new web3.eth.Contract(
    Flashswap.abi,
    addresses.flashswapRopsten.address
);

const { address: admin } = web3.eth.accounts.wallet.add(process.env.PRIVATE_KEY);

const WETH = '0xc778417e063141139fce010982780140aa0cd5ab';
const fromTokens = ['WETH'];
const fromToken = [
    '0xc778417e063141139fce010982780140aa0cd5ab' // WETH
];
const fromTokenDecimals = [18];

const toTokens = ['Weenus'];
const toToken = [
    '0x101848D5C5bBca18E6b4431eEdF6B95E9ADF82FA', // Weenus
];
const toTokenDecimals = [9];
const toTokenThreshold = [0.000000000001377376];
const amount = process.env.AMOUNT as string;

async function main() {
    let flag = false;
    let nonce = await web3.eth.getTransactionCount(admin);
    let gasPrice = await web3.eth.getGasPrice();

    setInterval(async () => {
        nonce = await web3.eth.getTransactionCount(admin);
        // gasPrice = await web3.eth.getGasPrice()
        gasPrice = "2500000010";
    }, 1000);

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

                // The quote currency needs to be WETH
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

                // The quote currency is not WETH
                if (typeof tokenIn === 'undefined') {
                    return;
                }

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
                if (!flag && price > toTokenThreshold[j]) {
                    console.log(`Price is higher than expected. (expected: ${toTokenThreshold[j]})`);
                    const deadline = Math.floor(Date.now() / 1000) + 60 * 10;
                    const tx = uniswapRouter.methods.swapExactETHForTokens(
                        amount1,
                        [WETH, toToken[j]],
                        process.env.WALLET_ADDRESS as string,
                        deadline
                    )
                    const data = tx.encodeABI();
                    const txData = {
                        gas: gasPrice,
                        from: admin,
                        to: addresses.uniswapMainnet.router,
                        data,
                        nonce: nonce,
                        value: await web3.utils.toWei(amount, 'ether')
                    }
                    try {
                        console.log(`[${block.number}] [${new Date().toLocaleString()}] : sending transactions...`, JSON.stringify(txData))
                        flag = true;
                        const receipt = await web3.eth.sendTransaction(txData);
                        flag = false;
                        console.log(receipt);
                    } catch (e) {
                        flag = false;
                        console.error('transaction error', e);
                    }
                }
                else{
                    console.log(`Price is lower than expected. (expected: ${toTokenThreshold[j]})`);
                }
            }
        })
        .on('error', error => {
            console.log(error);
        });
}

main();