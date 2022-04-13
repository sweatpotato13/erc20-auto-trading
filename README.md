# erc20-auto-trading

## Usage
* If you want sell your token, you must do `approve` action for these token for swap contract

* Before running this script, you must setting from and to token address and other infos like below

```typescript
...
const WETH = '0xc778417e063141139fce010982780140aa0cd5ab';
const fromTokens = ['WETH'];
const fromToken = [
    '0xc778417e063141139fce010982780140aa0cd5ab' // WETH
];
const fromTokenDecimals = [18];

const toTokens = ['DAI'];
const toToken = [
    '0xaD6D458402F60fD3Bd25163575031ACDce07538D', // DAI
];
const toTokenDecimals = [18];
const toTokenThreshold = [0];
...
```

```sh
# development
yarn sell:dev
yarn buy:dev

# production
yarn sell:prod
yarn buy:prod
```