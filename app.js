import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import ERC20ABI from './abi.json'; // Your ERC-20 ABI

const UNISWAP_V3_ROUTER_ADDRESS = "0xE592427A0AEce92De3Edee1F18E0157C05861564";

// Supported tokens for swapping on Sepolia
const supportedTokens = [
  { symbol: 'ETH', address: ethers.constants.AddressZero }, // ETH native token
  { symbol: 'DAI', address: '0xad6d458402f60fd3bd25163575031acdce07538d' },
  { symbol: 'USDC', address: '0x8267cf9254734c6eb452a7bb9aaf97b392258b21' },
];

function CryptoSwapApp() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [sellToken, setSellToken] = useState(supportedTokens[0]); // Default: ETH
  const [buyToken, setBuyToken] = useState(supportedTokens[1]);  // Default: DAI
  const [amountIn, setAmountIn] = useState('0.01');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const initProvider = async () => {
      if (window.ethereum) {
        const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
        const userSigner = web3Provider.getSigner();
        const walletAddress = await userSigner.getAddress();
        setProvider(web3Provider);
        setSigner(userSigner);
        setAccount(walletAddress);
      } else {
        alert('Please install MetaMask to use this app.');
      }
    };
    initProvider();
  }, []);

  // Function to swap tokens
  const swapTokens = async () => {
    if (!provider || !signer || !account) {
      alert('Please connect your wallet.');
      return;
    }

    setLoading(true);

    try {
      const amountInWei = ethers.utils.parseUnits(amountIn, sellToken.symbol === 'ETH' ? '18' : '6');
      
      // Approve the Uniswap router to spend the tokens (if ERC20)
      if (sellToken.symbol !== 'ETH') {
        const sellTokenContract = new ethers.Contract(sellToken.address, ERC20ABI, signer);
        await sellTokenContract.approve(UNISWAP_V3_ROUTER_ADDRESS, amountInWei);
      }

      // Set up the Uniswap Router Contract
      const SwapRouterABI = [
        'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
      ];
      const routerContract = new ethers.Contract(UNISWAP_V3_ROUTER_ADDRESS, SwapRouterABI, signer);

      const params = {
        tokenIn: sellToken.symbol === 'ETH' ? ethers.constants.AddressZero : sellToken.address,
        tokenOut: buyToken.address,
        fee: 3000, // 0.3% fee
        recipient: account,
        deadline: Math.floor(Date.now() / 1000) + 60 * 10, // 10 minutes
        amountIn: amountInWei,
        amountOutMinimum: 0, // Accept any amount out
        sqrtPriceLimitX96: 0,
      };

      const tx = await routerContract.exactInputSingle(params, {
        value: sellToken.symbol === 'ETH' ? amountInWei : 0, // Send ETH if swapping from ETH
        gasLimit: 200000,
      });
      await tx.wait();

      alert('Swap Complete!');
    } catch (error) {
      console.error('Swap error:', error);
      alert('Swap failed. Please check the console for details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1>Crypto Swap</h1>
      {account ? (
        <div>
          <p>Connected: {account}</p>
          <div>
            <label>Sell Token</label>
            <select value={sellToken.symbol} onChange={(e) => setSellToken(supportedTokens.find((t) => t.symbol === e.target.value))}>
              {supportedTokens.map((token) => (
                <option key={token.symbol} value={token.symbol}>
                  {token.symbol}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Buy Token</label>
            <select value={buyToken.symbol} onChange={(e) => setBuyToken(supportedTokens.find((t) => t.symbol === e.target.value))}>
              {supportedTokens.map((token) => (
                <option key={token.symbol} value={token.symbol}>
                  {token.symbol}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Amount</label>
            <input value={amountIn} onChange={(e) => setAmountIn(e.target.value)} />
          </div>
          <button onClick={swapTokens} disabled={loading}>
            {loading ? 'Swapping...' : 'Swap'}
          </button>
        </div>
      ) : (
        <p>Please connect your wallet.</p>
      )}
    </div>
  );
}

export default CryptoSwapApp;
