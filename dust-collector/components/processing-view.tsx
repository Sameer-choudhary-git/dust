"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { CheckCircle2, ArrowRight, AlertCircle } from "lucide-react"
import { ethers } from "ethers"
import { SimpleAccountAPI } from "@account-abstraction/sdk"
import { Connection, PublicKey, Transaction, sendAndConfirmTransaction } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, createTransferInstruction, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from '@solana/spl-token'

// Import your contract ABI
import DustCollectorABI from "@/lib/abi/dustcollector"

// Configuration
const DUST_COLLECTOR_ADDRESS = "0x6C9E083067FB6376d4eA5E3Da05E3ee3965757A3" // Replace with your contract address
const ENTRY_POINT_ADDRESS = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789" // Base Sepolia EntryPoint
const PAYMASTER_ENDPOINT = "https://api.developer.coinbase.com/rpc/v1/base-sepolia/S0yM5xPY0VjFfdaJHWCgpwF9AAJdoqja"
const SOLANA_DESTINATION_ADDRESS = "8KFUDYJYCTVpQjkuHuYroPmh72UWQrfHUDsyYJ5hgZMS" // Replace with your Solana destination wallet
const SOLANA_RPC_URL = "https://api.mainnet-beta.solana.com" // Or testnet if you're testing
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function transfer(address to, uint amount) returns (bool)"
]

interface ProcessingViewProps {
  onComplete: () => void
  userEthWalletAddress: string
  userSolWalletAddress?: string
  selectedChains: string[] // Array of selected chains: ["ethereum", "solana"] 
}

export default function MultiChainProcessingView({ 
  onComplete, 
  userEthWalletAddress, 
  userSolWalletAddress,
  selectedChains = ["ethereum"]
}: ProcessingViewProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [txHashes, setTxHashes] = useState<{chain: string, hash: string}[]>([])
  const [discoveredTokens, setDiscoveredTokens] = useState<{
    ethereum: Array<{address: string, balance: string, symbol: string, decimals: number}>,
    solana: Array<{address: string, balance: string, symbol: string, mint: string, tokenAmount: bigint}>
  }>({
    ethereum: [],
    solana: []
  })
  const [currentChain, setCurrentChain] = useState<string>("")

  const steps = [
    "Discovering dust tokens",
    "Preparing batch transactions",
    "Processing Ethereum tokens",
    "Processing Solana tokens",
    "Complete",
  ]

  useEffect(() => {
    // Discover tokens when component mounts
    const discoverTokens = async () => {
      setCurrentStep(0)
      
      try {
        if (selectedChains.includes("ethereum")) {
          await discoverEthereumTokens(userEthWalletAddress)
        }
        
        if (selectedChains.includes("solana") && userSolWalletAddress) {
          await discoverSolanaTokens(userSolWalletAddress)
        }
        
        setCurrentStep(1)
      } catch (err) {
        console.error("Error discovering tokens:", err)
        setError(`Failed to discover tokens: ${err.message}`)
      }
    }
    
    discoverTokens()
  }, [userEthWalletAddress, userSolWalletAddress, selectedChains])

  async function discoverEthereumTokens(address) {
    try {
      // Connect to the provider
      const provider = new ethers.providers.JsonRpcProvider("https://sepolia.base.org")
      
      // Get the list of token addresses for this wallet
      // In a production app, you would use an indexer like Covalent, Moralis, or The Graph
      // For this implementation, we'll use a contract call to get token addresses
      
      const dustCollectorContract = new ethers.Contract(
        DUST_COLLECTOR_ADDRESS,
        DustCollectorABI,
        provider
      )
      
      // Call the getWalletTokens function on your contract
      // You would need to implement this function in the smart contract
      // It should return all token addresses owned by this wallet
      const tokenAddresses = await dustCollectorContract.getWalletTokens(address)
      
      const tokens = []
      
      // For each token address, get the balance and token info
      for (const tokenAddress of tokenAddresses) {
        const tokenContract = new ethers.Contract(
          tokenAddress,
          ERC20_ABI,
          provider
        )
        
        // Get token information
        const [balance, decimals, symbol] = await Promise.all([
          tokenContract.balanceOf(address),
          tokenContract.decimals(),
          tokenContract.symbol()
        ])
        
        // Convert balance to human-readable format
        const formattedBalance = ethers.utils.formatUnits(balance, decimals)
        
        // Only include dust tokens (small balances)
        // You can adjust this threshold based on your definition of dust
        if (parseFloat(formattedBalance) > 0 && parseFloat(formattedBalance) < 5.0) {
          tokens.push({
            address: tokenAddress,
            balance: formattedBalance,
            symbol,
            decimals
          })
        }
      }
      
      setDiscoveredTokens(prev => ({...prev, ethereum: tokens}))
      return tokens
    } catch (err) {
      console.error("Error discovering Ethereum tokens:", err)
      setError("Failed to discover Ethereum tokens. Please try again.")
      return []
    }
  }
  
  async function discoverSolanaTokens(address) {
    try {
      const connection = new Connection(SOLANA_RPC_URL)
      
      // Get all token accounts owned by the user
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        new PublicKey(address),
        { programId: TOKEN_PROGRAM_ID }
      )
      
      // Filter and map the token accounts
      const solTokens = await Promise.all(tokenAccounts.value
        .filter(item => {
          const balance = item.account.data.parsed.info.tokenAmount.uiAmount
          // Only include dust (tokens with small balances)
          return balance > 0 && balance < 5.0 
        })
        .map(async item => {
          // Get token metadata if available
          let symbol = "Unknown"
          try {
            const mint = new PublicKey(item.account.data.parsed.info.mint)
            // Try to get token metadata from token metadata program
            // In a production app, you would use the Metaplex SDK
            const tokenMetadata = await connection.getTokenSupply(mint)
            if (tokenMetadata?.value?.symbol) {
              symbol = tokenMetadata.value.symbol
            }
          } catch (err) {
            console.log("Could not get token metadata, using generic symbol")
          }
          
          return {
            address: item.pubkey.toString(),
            balance: item.account.data.parsed.info.tokenAmount.uiAmount.toString(),
            mint: item.account.data.parsed.info.mint,
            symbol,
            tokenAmount: BigInt(item.account.data.parsed.info.tokenAmount.amount)
          }
        }))
      
      setDiscoveredTokens(prev => ({...prev, solana: solTokens}))
      return solTokens
    } catch (err) {
      console.error("Error discovering Solana tokens:", err)
      setError("Failed to discover Solana tokens. Please try again.")
      return []
    }
  }

  // Handle paymaster data from Coinbase Paymaster
  async function getPaymasterData(userOp, paymasterUrl) {
    try {
      const response = await fetch(paymasterUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_paymasterAndDataForUserOperation',
          params: [userOp, ENTRY_POINT_ADDRESS]
        })
      })
      
      const responseData = await response.json()
      if (responseData.error) {
        throw new Error(`Paymaster error: ${responseData.error.message}`)
      }
      return responseData.result
    } catch (error) {
      console.error("Error getting paymaster data:", error)
      throw error
    }
  }

  // Send user operation to bundler
  async function sendUserOpToBundler(userOp, bundlerUrl) {
    try {
      const response = await fetch(bundlerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_sendUserOperation',
          params: [userOp, ENTRY_POINT_ADDRESS]
        })
      })
      
      const responseData = await response.json()
      if (responseData.error) {
        throw new Error(`Bundler error: ${responseData.error.message}`)
      }
      return responseData.result // This is the user operation hash
    } catch (error) {
      console.error("Error sending user operation:", error)
      throw error
    }
  }

  // Wait for user operation receipt
  async function getUserOperationReceipt(userOpHash, bundlerUrl) {
    let attempts = 0
    const maxAttempts = 20
    
    while (attempts < maxAttempts) {
      try {
        const response = await fetch(bundlerUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'eth_getUserOperationReceipt',
            params: [userOpHash]
          })
        })
        
        const responseData = await response.json()
        if (responseData.result) {
          return responseData.result
        }
      } catch (error) {
        console.error("Error getting receipt:", error)
      }
      
      attempts++
      await new Promise(resolve => setTimeout(resolve, 3000)) // Wait 3 seconds
    }
    
    throw new Error("Transaction not confirmed after multiple attempts")
  }

  async function processEthereumTokens() {
    try {
      setCurrentChain("ethereum")
      // Only proceed if we have Ethereum tokens to process
      if (discoveredTokens.ethereum.length === 0) {
        console.log("No Ethereum tokens to process")
        return
      }
      
      // Connect to the provider
      const provider = new ethers.providers.JsonRpcProvider("https://sepolia.base.org")
      
      // Create smart account for the user
      // In a production app, you would securely manage private keys
      // or use a browser wallet like MetaMask
      const walletSigner = new ethers.Wallet(localStorage.getItem("privateKey") || "", provider)
      const accountAPI = new SimpleAccountAPI({
        provider,
        entryPointAddress: ENTRY_POINT_ADDRESS,
        owner: walletSigner
      })
      
      // Prepare the batchDeposit call
      const contractInterface = new ethers.utils.Interface(DustCollectorABI)
      
      const tokenAddresses = discoveredTokens.ethereum.map(token => token.address)
      // Convert string balances to ethers BigNumber with proper decimals
      const tokenAmounts = discoveredTokens.ethereum.map(token => 
        ethers.utils.parseUnits(token.balance, token.decimals)
      )
      
      const callData = contractInterface.encodeFunctionData(
        "batchDeposit", 
        [tokenAddresses, tokenAmounts]
      )
      
      // Create signed user operation with the paymaster
      let userOp = await accountAPI.createSignedUserOp({
        target: DUST_COLLECTOR_ADDRESS,
        value: 0,
        data: callData,
        maxFeePerGas: ethers.utils.parseUnits("1", "gwei"),
        maxPriorityFeePerGas: ethers.utils.parseUnits("1", "gwei")
      })
      
      // Add paymaster data
      userOp.paymasterAndData = await getPaymasterData(userOp, PAYMASTER_ENDPOINT)
      
      // Send the user operation to the bundler
      const userOpHash = await sendUserOpToBundler(userOp, PAYMASTER_ENDPOINT)
      
      // Store transaction hash
      setTxHashes(prev => [...prev, {chain: "ethereum", hash: userOpHash}])
      
      // Wait for the transaction to be confirmed
      await getUserOperationReceipt(userOpHash, PAYMASTER_ENDPOINT)
      
      // Now execute the withdrawAsEth function to swap tokens to ETH
      const withdrawCallData = contractInterface.encodeFunctionData(
        "withdrawAsEth", 
        [tokenAddresses]
      )
      
      // Create and sign new user operation for withdrawal
      let withdrawUserOp = await accountAPI.createSignedUserOp({
        target: DUST_COLLECTOR_ADDRESS,
        value: 0,
        data: withdrawCallData,
        maxFeePerGas: ethers.utils.parseUnits("1", "gwei"),
        maxPriorityFeePerGas: ethers.utils.parseUnits("1", "gwei")
      })
      
      // Add paymaster data
      withdrawUserOp.paymasterAndData = await getPaymasterData(withdrawUserOp, PAYMASTER_ENDPOINT)
      
      // Send the withdrawal user operation
      const withdrawOpHash = await sendUserOpToBundler(withdrawUserOp, PAYMASTER_ENDPOINT)
      
      // Store transaction hash
      setTxHashes(prev => [...prev, {chain: "ethereum", hash: withdrawOpHash}])
      
      // Wait for the withdrawal to be confirmed
      await getUserOperationReceipt(withdrawOpHash, PAYMASTER_ENDPOINT)
      
      return true
    } catch (err) {
      console.error("Error processing Ethereum tokens:", err)
      setError(`Error processing Ethereum tokens: ${err.message}`)
      return false
    }
  }

  async function processSolanaTokens() {
    try {
      setCurrentChain("solana")
      // Only proceed if we have Solana tokens to process
      if (!discoveredTokens.solana.length || !userSolWalletAddress) {
        console.log("No Solana tokens to process or no wallet address")
        return
      }
      
      // Connect to Solana
      const connection = new Connection(SOLANA_RPC_URL)
      
      // We'll need to get the user's Solana keypair from somewhere
      // In a production app, you would use a wallet adapter
      // For now, we'll assume we have the private key stored
      const userSolanaKeypair = getSolanaKeypair()
      
      // Process tokens in batches to avoid transaction size limits
      const batchSize = 5
      const tokenBatches = []
      
      for (let i = 0; i < discoveredTokens.solana.length; i += batchSize) {
        tokenBatches.push(discoveredTokens.solana.slice(i, i + batchSize))
      }
      
      for (const tokenBatch of tokenBatches) {
        // Create a new transaction for this batch
        const transaction = new Transaction()
        
        // Add transfer instructions for each token in the batch
        for (const token of tokenBatch) {
          const sourceTokenAccount = new PublicKey(token.address)
          const mint = new PublicKey(token.mint)
          
          // Get associated token account for destination
          const destinationTokenAccount = await getAssociatedTokenAddress(
            mint,
            new PublicKey(SOLANA_DESTINATION_ADDRESS)
          )
          
          // Check if the destination account exists
          const destinationAccountExists = await connection.getAccountInfo(destinationTokenAccount)
          
          // If destination account doesn't exist, create it first
          if (!destinationAccountExists) {
            transaction.add(
              createAssociatedTokenAccountInstruction(
                new PublicKey(userSolWalletAddress), // payer
                destinationTokenAccount, // associated token account
                new PublicKey(SOLANA_DESTINATION_ADDRESS), // owner
                mint // mint
              )
            )
          }
          
          // Add transfer instruction
          transaction.add(
            createTransferInstruction(
              sourceTokenAccount, // source
              destinationTokenAccount, // destination
              new PublicKey(userSolWalletAddress), // owner
              token.tokenAmount, // amount (using the BigInt amount)
              [] // multiSigners
            )
          )
        }
        
        // Set the fee payer
        transaction.feePayer = new PublicKey(userSolWalletAddress)
        
        // Get a recent blockhash
        const { blockhash } = await connection.getLatestBlockhash()
        transaction.recentBlockhash = blockhash
        
        // Sign the transaction
        transaction.sign(userSolanaKeypair)
        
        // Send and confirm the transaction
        const signature = await sendAndConfirmTransaction(
          connection,
          transaction,
          [userSolanaKeypair]
        )
        
        // Store transaction hash
        setTxHashes(prev => [...prev, {chain: "solana", hash: signature}])
      }
      
      return true
    } catch (err) {
      console.error("Error processing Solana tokens:", err)
      setError(`Error processing Solana tokens: ${err.message}`)
      return false
    }
  }
  
  // Helper function to get the Solana keypair
  // In a production app, you would use a secure method to manage keys
  function getSolanaKeypair() {
    // This is a placeholder for demonstration purposes
    // In a real application, you would use a secure method to get the keypair
    // For example, integrating with a browser wallet like Phantom
    
    // For testing purposes, you might use localStorage
    const privateKeyString = localStorage.getItem("solanaPrivateKey")
    if (!privateKeyString) {
      throw new Error("Solana private key not found")
    }
    
    try {
      // This is a placeholder and would need to be replaced with actual key handling
      const privateKeyUint8 = new Uint8Array(JSON.parse(privateKeyString))
      return Keypair.fromSecretKey(privateKeyUint8)
    } catch (err) {
      throw new Error("Invalid Solana private key format")
    }
  }

  const processDustCollection = async () => {
    try {
      setIsProcessing(true)
      setCurrentStep(1) // Start from step 2 since discovery is done in useEffect
      setError(null)
      
      // Step 2: Prepare transactions - already in step 1 from useEffect
      await new Promise(resolve => setTimeout(resolve, 1000))
      setCurrentStep(2)
      
      // Step 3: Process Ethereum tokens
      if (selectedChains.includes("ethereum")) {
        await processEthereumTokens()
      }
      
      setCurrentStep(3)
      
      // Step 4: Process Solana tokens
      if (selectedChains.includes("solana") && userSolWalletAddress) {
        await processSolanaTokens()
      }
      
      // Step 5: Complete
      setCurrentStep(4)
      
    } catch (err) {
      console.error("Error processing dust collection:", err)
      setError(err.message || "An error occurred during processing")
    }
  }

  const startProcessing = () => {
    processDustCollection()
  }

  // Calculate the total number of tokens being processed
  const totalTokenCount = 
    (selectedChains.includes("ethereum") ? discoveredTokens.ethereum.length : 0) +
    (selectedChains.includes("solana") ? discoveredTokens.solana.length : 0)

  // Calculate estimated gas savings
  const estimatedGasSavings = totalTokenCount * 0.075 // Approximate savings per token in USD

  return (
    <div>
      <div className="mb-8">
        <h3 className="text-xl font-medium mb-3">Multi-Chain Batch Processing</h3>
        <p className="text-base text-gray-400 mb-6">
          We'll batch process your dust across {selectedChains.join(" & ")} to maximize value recovery.
        </p>

        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-6 flex items-center">
            <AlertCircle className="text-red-500 mr-3" />
            <p className="text-red-200">{error}</p>
          </div>
        )}

        <div className="mb-5">
          <div className="flex justify-between items-center mb-3">
            <span className="text-base font-medium">Processing Status</span>
            <span className="text-base text-gray-400">Step {isProcessing ? currentStep + 1 : 0} of 5</span>
          </div>
          <Progress value={isProcessing ? (currentStep + 1) * 20 : 0} className="h-3" />
        </div>

        <div className="space-y-5 mb-8">
          {steps.map((step, index) => (
            <div key={index} className="flex items-center gap-4">
              <div className="flex-shrink-0">
                {currentStep > index ? (
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                ) : currentStep === index ? (
                  <div className="h-6 w-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-base">
                    {index + 1}
                  </div>
                ) : (
                  <div className="h-6 w-6 rounded-full border border-gray-600 text-gray-600 flex items-center justify-center text-base">
                    {index + 1}
                  </div>
                )}
              </div>
              <span className={`text-base ${currentStep >= index ? "text-white" : "text-gray-500"}`}>
                {step}
                {index === 2 && currentChain === "ethereum" && " (Ethereum)"}
                {index === 3 && currentChain === "solana" && " (Solana)"}
              </span>
            </div>
          ))}
        </div>

        {currentStep >= steps.length - 1 ? (
          <Button onClick={onComplete} className="w-full bg-blue-600 hover:bg-blue-700 text-base py-3">
            Continue to Aggregate
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        ) : (
          <Button
            onClick={startProcessing}
            disabled={isProcessing || (totalTokenCount === 0 && currentStep > 0)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-base py-3"
          >
            {isProcessing ? "Processing..." : "Start Processing"}
          </Button>
        )}
      </div>

      <div className="mt-8">
        <h3 className="text-xl font-medium mb-3">Processing Details</h3>
        <div className="bg-gray-800 rounded-lg p-5 text-base">
          <div className="grid grid-cols-2 gap-5">
            <div>
              <div className="text-gray-400 mb-2">Estimated Gas Savings</div>
              <div className="font-medium">${estimatedGasSavings.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-gray-400 mb-2">Processing Fee</div>
              <div className="font-medium">0.5%</div>
            </div>
            <div>
              <div className="text-gray-400 mb-2">Estimated Completion</div>
              <div className="font-medium">~{selectedChains.length * 2} minutes</div>
            </div>
            <div>
              <div className="text-gray-400 mb-2">Tokens Processed</div>
              <div className="font-medium">{totalTokenCount || 0} tokens</div>
            </div>
          </div>
        </div>
      </div>

      {txHashes.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xl font-medium mb-3">Transaction Details</h3>
          <div className="bg-gray-800 rounded-lg p-5 text-base">
            <div className="space-y-3">
              {txHashes.map((tx, index) => (
                <div key={index} className="flex flex-col">
                  <div className="text-gray-400 mb-1">
                    {tx.chain === "ethereum" ? "Ethereum" : "Solana"} Transaction {index + 1}
                  </div>
                  <a 
                    href={tx.chain === "ethereum" 
                      ? `https://sepolia.basescan.org/tx/${tx.hash}`
                      : `https://explorer.solana.com/tx/${tx.hash}`
                    } 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="font-medium text-blue-400 break-all hover:underline"
                  >
                    {tx.hash}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}