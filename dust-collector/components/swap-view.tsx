"use client"

import { useState, useEffect } from "react"
import { useAccount, useNetwork, usePublicClient, useWalletClient } from "wagmi"
import { parseEther, formatEther } from "viem"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DollarSign, CheckCircle2, Loader2 } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { dustCollectorABI } from "@/lib/abis/dustCollector"

// Contract address for DustCollector - replace with your deployed contract address
const DUST_COLLECTOR_ADDRESS = "0x6C9E083067FB6376d4eA5E3Da05E3ee3965757A3"

export default function SwapView() {
  const { address } = useAccount()
  const { chain } = useNetwork()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  
  const [swapComplete, setSwapComplete] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [txHash, setTxHash] = useState("")
  const [transactions, setTransactions] = useState<any[]>([])
  const [dustTokens, setDustTokens] = useState<string[]>([])
  const [totalEthEstimate, setTotalEthEstimate] = useState<string>("0")
  
  // Use event logs to find dust tokens for the current user
  const fetchUserDustTokens = async () => {
    if (!address || !publicClient) return
    
    try {
      setIsLoading(true)
      
      // Get all DustReceived events for this user
      const events = await publicClient.getContractEvents({
        address: DUST_COLLECTOR_ADDRESS,
        abi: dustCollectorABI,
        eventName: 'DustReceived',
        args: {
          user: address
        },
        fromBlock: 'earliest'
      })
      
      // Extract unique token addresses
      const uniqueTokens = new Set<string>()
      for (const event of events) {
        if (event.args.token) {
          uniqueTokens.add(event.args.token as string)
        }
      }
      
      // Check each token's balance
      const tokensWithBalance: string[] = []
      for (const token of uniqueTokens) {
        const balance = await publicClient.readContract({
          address: DUST_COLLECTOR_ADDRESS,
          abi: dustCollectorABI,
          functionName: 'getUserBalance',
          args: [address, token]
        })
        
        if (balance > 0n) {
          tokensWithBalance.push(token)
        }
      }
      
      setDustTokens(tokensWithBalance)
      
      // Get rough ETH estimate (in real app, we'd use price feeds)
      // For now, just get the token count and multiply by a basic estimate
      setTotalEthEstimate((tokensWithBalance.length * 0.001).toFixed(3))
      
      setIsLoading(false)

    } catch (error) {
      console.error("Error fetching dust tokens:", error)
      toast({
        title: "Error",
        description: "Failed to fetch your dust tokens",
        variant: "destructive"
      })
      setIsLoading(false)
    }
  }
  
  // Run when address changes
  useEffect(() => {
    if (address) {
      fetchUserDustTokens()
    }
  }, [address, publicClient])

  // Handle aggregation to ETH
  const handleSwap = async () => {
    if (!walletClient || !address || dustTokens.length === 0) {
      toast({
        title: "Error",
        description: "Please connect your wallet and ensure you have dust tokens",
        variant: "destructive"
      })
      return
    }
    
    try {
      setIsLoading(true)
      
      // Call withdrawAsEth with the list of tokens
      const hash = await walletClient.writeContract({
        address: DUST_COLLECTOR_ADDRESS,
        abi: dustCollectorABI,
        functionName: 'withdrawAsEth',
        args: [dustTokens]
      })
      
      setTxHash(hash)
      
      // Wait for transaction to be confirmed
      await publicClient.waitForTransactionReceipt({ hash })
      
      // Transaction successful
      setSwapComplete(true)
      
      // Add to transaction history
      const newTransaction = {
        type: "Converted to ETH",
        timestamp: new Date(),
        amount: totalEthEstimate,
        tokenCount: dustTokens.length
      }
      
      setTransactions(prev => [newTransaction, ...prev])
      
      toast({
        title: "Success",
        description: `Successfully converted ${dustTokens.length} tokens to ETH!`,
        variant: "success"
      })
      
      // Clear dust tokens as they've been converted
      setDustTokens([])
      
    } catch (error) {
      console.error("Swap error:", error)
      toast({
        title: "Transaction Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h3 className="text-xl font-medium mb-3">Aggregate on Base</h3>
        <p className="text-base text-gray-400 mb-6">
          Your dust tokens are ready to be aggregated into ETH for better utility.
        </p>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="mb-6">
            <div className="text-base mb-2">Available Dust</div>
            <div className="flex items-center">
              <div className="h-7 w-7 text-blue-400 mr-2 flex items-center justify-center text-sm font-bold">
                {dustTokens.length}
              </div>
              <span className="text-3xl font-bold">Tokens</span>
            </div>
            <div className="mt-2 text-sm text-gray-400">
              {dustTokens.length > 0 
                ? `You have ${dustTokens.length} different dust tokens ready to convert`
                : isLoading 
                  ? "Loading your tokens..."
                  : "No dust tokens found in your wallet"}
            </div>
          </div>

          <div className="mb-6">
            <div className="text-base mb-2">Aggregate To</div>
            <Select defaultValue="eth">
              <SelectTrigger className="w-full bg-gray-700 text-base py-3">
                <SelectValue>
                  <div className="flex items-center">
                    <div className="w-6 h-6 rounded-full bg-blue-600 mr-2 flex items-center justify-center text-sm">
                      Ξ
                    </div>
                    ETH
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="eth">
                  <div className="flex items-center">
                    <div className="w-6 h-6 rounded-full bg-blue-600 mr-2 flex items-center justify-center text-sm">
                      Ξ
                    </div>
                    ETH
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="mb-6 p-4 bg-gray-700 rounded-lg">
            <div className="text-base">You'll receive approximately</div>
            <div className="text-2xl font-bold">~{totalEthEstimate} ETH</div>
            <div className="text-sm text-gray-400 mt-2">
              Estimate based on current number of dust tokens
            </div>
          </div>

          {swapComplete ? (
            <div className="bg-green-900/30 border border-green-700 rounded-lg p-5 mb-6">
              <div className="flex items-center text-green-400 mb-2">
                <CheckCircle2 className="h-6 w-6 mr-2" />
                <span className="font-medium text-base">Aggregation Completed Successfully</span>
              </div>
              <p className="text-base">You've received approximately {totalEthEstimate} ETH in your wallet.</p>
              {txHash && (
                <a 
                  href={`${chain?.blockExplorers?.default.url}/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer" 
                  className="text-blue-400 hover:text-blue-300 text-sm mt-2 inline-block"
                >
                  View transaction
                </a>
              )}
            </div>
          ) : (
            <Button 
              onClick={handleSwap} 
              disabled={isLoading || dustTokens.length === 0}
              className="w-full bg-blue-600 hover:bg-blue-700 text-base py-3"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Aggregate Now"
              )}
            </Button>
          )}
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-xl font-medium mb-3">Transaction History</h3>
        <div className="bg-gray-800 rounded-lg p-5">
          {transactions.length > 0 ? (
            <div className="space-y-3">
              {transactions.map((tx, idx) => (
                <div key={idx} className="flex justify-between items-center p-4 bg-gray-700 rounded-lg">
                  <div>
                    <div className="font-medium text-base">{tx.type}</div>
                    <div className="text-sm text-gray-400">
                      {tx.timestamp.toLocaleDateString()} {tx.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-green-400 text-base">+{tx.amount} ETH</div>
                    <div className="text-sm text-gray-400">{tx.tokenCount} tokens</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <p className="text-base">No transactions yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}