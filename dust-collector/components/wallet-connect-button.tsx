"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { CheckCircle, Loader2, RefreshCw } from "lucide-react"
import { ethers } from "ethers"
import * as web3 from '@solana/web3.js'
import * as splToken from '@solana/spl-token'

// ERC20 ABI - just the balanceOf and decimals functions we need
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)"
]

// Common token addresses - typically you'd have a larger list or API service
const COMMON_ERC20_TOKENS = {
  // Ethereum Mainnet
  "ETH": "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", // Native ETH placeholder
  "USDC": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  "USDT": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "DAI": "0x6B175474E89094C44Da98b954EedeAC495271d0F",
}

// Common Solana SPL tokens on testnet - these addresses would need to be updated
// with actual testnet token addresses for your specific project
const COMMON_SPL_TOKENS = {
  "USDC": "CpMah17kQEL2wqyMKt3mZBdTnZbkbfx4nqmQMFDP5vwp", // Example testnet USDC address
  "USDT": "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU", // Example testnet USDT address
  // Add more testnet tokens as needed
}

interface TokenBalance {
  symbol: string;
  amount: string;
  rawAmount: string;
  decimals: number;
  tokenAddress?: string;
  tokenMint?: string;
  network: "ethereum" | "solana";
}

interface WalletItemProps {
  wallet: {
    id: number
    name: string
    address: string
    connected: boolean
    type: string
  }
}

// Define types for the wallet providers
declare global {
  interface Window {
    ethereum?: any;
    solana?: {
      connect: () => Promise<{ publicKey: { toString: () => string } }>;
      disconnect: () => Promise<void>;
      on: (event: string, callback: () => void) => void;
      isPhantom?: boolean;
    };
  }
}

export default function WalletItem({ wallet: initialWallet }: WalletItemProps) {
  const [wallet, setWallet] = useState(initialWallet)
  const [isConnectingEth, setIsConnectingEth] = useState(false)
  const [isConnectingSol, setIsConnectingSol] = useState(false)
  const [isLoadingBalances, setIsLoadingBalances] = useState(false)
  const [balances, setBalances] = useState<TokenBalance[]>([])

  useEffect(() => {
    if (wallet.connected) {
      fetchBalances();
    } else {
      setBalances([]);
    }
  }, [wallet.connected]);

  async function fetchBalances() {
    if (!wallet.connected) return;
    
    setIsLoadingBalances(true);
    
    try {
      if (wallet.type === "ethereum") {
        await fetchEthereumBalances();
      } else if (wallet.type === "solana") {
        await fetchSolanaBalances();
      }
    } catch (error) {
      console.error("Error fetching balances:", error);
    } finally {
      setIsLoadingBalances(false);
    }
  }

  async function fetchEthereumBalances() {
    if (!window.ethereum) return;
    
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const address = await signer.getAddress();
    
    // Get ETH balance
    const ethBalance = await provider.getBalance(address);
    const formattedEth = ethers.utils.formatEther(ethBalance);
    
    const newBalances: TokenBalance[] = [{
      symbol: "ETH",
      amount: parseFloat(formattedEth).toFixed(4),
      rawAmount: ethBalance.toString(),
      decimals: 18,
      tokenAddress: COMMON_ERC20_TOKENS.ETH,
      network: "ethereum"
    }];
    
    // Fetch some common ERC20 token balances
    for (const [symbol, tokenAddress] of Object.entries(COMMON_ERC20_TOKENS)) {
      if (symbol === "ETH") continue; // Skip ETH as we already added it
      
      try {
        const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
        const balance = await tokenContract.balanceOf(address);
        
        if (balance.gt(0)) {
          const decimals = await tokenContract.decimals();
          const formattedBalance = ethers.utils.formatUnits(balance, decimals);
          
          newBalances.push({
            symbol,
            amount: parseFloat(formattedBalance).toFixed(4),
            rawAmount: balance.toString(),
            decimals,
            tokenAddress,
            network: "ethereum"
          });
        }
      } catch (err) {
        console.warn(`Error fetching balance for ${symbol}:`, err);
      }
    }
    
    setBalances(newBalances);
  }

  async function fetchSolanaBalances() {
    if (!window.solana || !window.solana.isPhantom) return;
    
    // Use testnet instead of mainnet-beta
    const connection = new web3.Connection(web3.clusterApiUrl('testnet'), 'confirmed');
    const publicKey = new web3.PublicKey(await window.solana.connect().then(resp => resp.publicKey.toString()));
    
    const newBalances: TokenBalance[] = [];
    
    try {
      // Get native SOL balance
      const solBalance = await connection.getBalance(publicKey);
      const formattedSol = (solBalance / web3.LAMPORTS_PER_SOL).toFixed(4);
      
      newBalances.push({
        symbol: "SOL",
        amount: formattedSol,
        rawAmount: solBalance.toString(),
        decimals: 9,
        tokenMint: "So11111111111111111111111111111111111111112", // Native SOL mint address
        network: "solana"
      });
      
      // Fetch SPL token accounts owned by this wallet
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        publicKey,
        { programId: splToken.TOKEN_PROGRAM_ID }
      );
      
      // Process each token account
      for (const { account } of tokenAccounts.value) {
        const parsedInfo = account.data.parsed.info;
        const tokenMint = parsedInfo.mint;
        const rawAmount = parsedInfo.tokenAmount.amount;
        const decimals = parsedInfo.tokenAmount.decimals;
        
        // Skip accounts with zero balance
        if (rawAmount === "0") continue;
        
        // Try to find known token symbol
        let symbol = "Unknown";
        for (const [tokenSymbol, address] of Object.entries(COMMON_SPL_TOKENS)) {
          if (address === tokenMint) {
            symbol = tokenSymbol;
            break;
          }
        }
        
        // For unknown tokens, try to get symbol from on-chain metadata
        if (symbol === "Unknown") {
          try {
            // You would need to fetch token metadata here
            // This is simplified - in production you would use a metadata program
            symbol = `SPL-${tokenMint.slice(0, 4)}`;
          } catch (err) {
            // Fall back to a shortened mint address as symbol
            symbol = `Token-${tokenMint.slice(0, 4)}`;
          }
        }
        
        // Format and add the balance
        const formattedAmount = (parseInt(rawAmount) / Math.pow(10, decimals)).toFixed(4);
        
        newBalances.push({
          symbol,
          amount: formattedAmount,
          rawAmount,
          decimals,
          tokenMint,
          network: "solana"
        });
      }
      
      setBalances(newBalances);
    } catch (error) {
      console.error("Error fetching Solana balances:", error);
      // If there's an error, at least show SOL balance if we have it
      if (newBalances.length > 0) {
        setBalances(newBalances);
      }
    }
  }

  async function connectEthereumWallet() {
    if (!window.ethereum) {
      alert("No Ethereum wallet detected. Please install a wallet extension.");
      return;
    }

    setIsConnectingEth(true);
    
    try {
      // Request account access
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      // Get the first account
      const address = accounts[0];

      // Subscribe to accounts change
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          // User disconnected their wallet
          setWallet({
            ...wallet,
            connected: false,
            address: initialWallet.address
          });
          setBalances([]);
        } else {
          // Account changed, update address and balances
          const newAddress = accounts[0];
          setWallet({
            ...wallet,
            address: `${newAddress.slice(0, 6)}...${newAddress.slice(-4)}`
          });
          fetchBalances();
        }
      });
      
      setWallet({
        ...wallet,
        connected: true,
        address: `${address.slice(0, 6)}...${address.slice(-4)}`
      });
    } catch (error) {
      console.error("Error connecting to Ethereum wallet:", error);
      alert("Failed to connect to Ethereum wallet.");
    } finally {
      setIsConnectingEth(false);
    }
  }

  async function connectSolanaWallet() {
    try {
      // Check if Phantom is installed
      if (!window.solana || !window.solana.isPhantom) {
        alert("Solana wallet not found. Please install a Solana wallet extension.");
        return;
      }

      setIsConnectingSol(true);
      
      // Establish connection to the wallet
      const response = await window.solana.connect();
      
      // Get public key from the established connection
      const publicKey = response.publicKey.toString();
      
      // Listen for wallet disconnect
      window.solana.on('disconnect', () => {
        setWallet({
          ...wallet,
          connected: false,
          address: initialWallet.address
        });
        setBalances([]);
      });
      
      setWallet({
        ...wallet,
        connected: true,
        address: `${publicKey.slice(0, 6)}...${publicKey.slice(-4)}`
      });
    } catch (error) {
      console.error("Error connecting to Solana wallet:", error);
      alert("Failed to connect to Solana wallet.");
    } finally {
      setIsConnectingSol(false);
    }
  }

  return (
    <div className="flex flex-col bg-gray-800 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-base">
            {wallet.type === "ethereum" && "E"}
            {wallet.type === "solana" && "S"}
          </div>
          <div>
            <div className="font-medium text-base">{wallet.name}</div>
            <div className="text-sm text-gray-400">{wallet.address}</div>
          </div>
        </div>
        {wallet.connected ? (
          <div className="flex items-center">
            <div className="flex items-center text-green-400 text-base mr-3">
              <CheckCircle className="h-5 w-5 mr-2" />
              Connected
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="p-1"
              onClick={fetchBalances}
              disabled={isLoadingBalances}
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingBalances ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        ) : (
          <Button 
            variant="outline" 
            size="sm" 
            className="text-base px-4 py-2"
            onClick={wallet.type === "ethereum" ? connectEthereumWallet : connectSolanaWallet}
            disabled={isConnectingEth || isConnectingSol}
          >
            {(isConnectingEth || isConnectingSol) ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Connecting
              </>
            ) : (
              "Connect"
            )}
          </Button>
        )}
      </div>
      
      {/* Balance section */}
      {wallet.connected && (
        <div className="px-4 pb-4">
          <div className="bg-gray-700 rounded-lg p-3">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium text-gray-300">Token Balances</h3>
              {isLoadingBalances && (
                <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
              )}
            </div>
            
            {balances.length > 0 ? (
              <div className="space-y-2">
                {balances.map((token, index) => (
                  <div key={index} className="flex justify-between items-center hover:bg-gray-600 p-2 rounded-md">
                    <div className="flex items-center">
                      <div className="w-6 h-6 rounded-full bg-gray-500 flex items-center justify-center text-xs mr-2">
                        {token.symbol.charAt(0)}
                      </div>
                      <span className="text-sm font-medium">{token.symbol}</span>
                    </div>
                    <span className="text-sm">{token.amount}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-400 text-center py-2">
                {isLoadingBalances ? "Loading balances..." : "No tokens found"}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}