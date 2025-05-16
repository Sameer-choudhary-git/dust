"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Search, ArrowRight, Info } from "lucide-react"
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"



interface TokenSelectionProps {
  onProceed: (selectedTokens: any[]) => void
}

export default function TokenSelection({ onProceed }: TokenSelectionProps) {
  const [tokens, setTokens] = useState(dummyTokens.filter(isDustToken))
  const [selectedTokens, setSelectedTokens] = useState<number[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  
  // Calculate total value of selected tokens
  const totalSelectedValue = tokens
    .filter(token => selectedTokens.includes(token.id))
    .reduce((sum, token) => sum + token.valueUsd, 0)
    .toFixed(2)

  // Filter tokens based on search query
  const filteredTokens = tokens.filter(token => 
    token.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    token.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Simulate loading tokens from connected wallets
  useEffect(() => {
    setIsLoading(true)
    // In a real implementation, you would fetch tokens from connected wallets here
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1500)
    
    return () => clearTimeout(timer)
  }, [])

  const handleTokenSelect = (tokenId: number | string) => {
    if (selectedTokenIds.includes(tokenId)) {
      setSelectedTokenIds(selectedTokenIds.filter(id => id !== tokenId))
    } else {
      setSelectedTokenIds([...selectedTokenIds, tokenId])
    }
  }

  const handleSelectAll = () => {
    if (selectedTokenIds.length === filteredTokens.length) {
      setSelectedTokenIds([])
    } else {
      setSelectedTokenIds(filteredTokens.map(token => token.id))
    }
  }

  const handleProceed = () => {
    const tokensToProcess = tokens.filter(token => selectedTokenIds.includes(token.id))
    onProceed(tokensToProcess)
  }
  
  // Reset selections when tokens change
  useEffect(() => {
    setSelectedTokenIds([])
  }, [tokens])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Select Tokens to Process</h2>
        <p className="text-gray-400">
          Choose which dust tokens you want to batch process and bridge to Base.
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent align-middle"></div>
          <p className="mt-4 text-gray-400">Loading tokens from connected wallets...</p>
        </div>
      ) : tokens.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400">No dust tokens found in your connected wallets.</p>
          <p className="mt-2 text-sm text-gray-500">Connect more wallets or try refreshing balances.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search tokens"
                className="pl-10 bg-gray-800 border-gray-700"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button 
              variant="outline" 
              className="whitespace-nowrap" 
              onClick={handleSelectAll}
            >
              {selectedTokenIds.length === filteredTokens.length ? "Deselect All" : "Select All"}
            </Button>
          </div>

          <div className="border border-gray-700 rounded-lg overflow-hidden">
            <div className="grid grid-cols-12 gap-2 p-4 bg-gray-800 text-gray-400 text-sm font-medium">
              <div className="col-span-1"></div>
              <div className="col-span-3">Token</div>
              <div className="col-span-2">Chain</div>
              <div className="col-span-3 text-right">Balance</div>
              <div className="col-span-3 text-right">Value (USD)</div>
            </div>

            <div className="divide-y divide-gray-700 max-h-96 overflow-y-auto">
              {filteredTokens.length > 0 ? (
                filteredTokens.map(token => (
                  <div key={token.id} className="grid grid-cols-12 gap-2 p-4 hover:bg-gray-800 transition-colors items-center">
                    <div className="col-span-1">
                      <Checkbox
                        checked={selectedTokenIds.includes(token.id)}
                        onCheckedChange={() => handleTokenSelect(token.id)}
                      />
                    </div>
                    <div className="col-span-3 flex items-center">
                      <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold mr-2">
                        {token.symbol.substring(0, 2)}
                      </div>
                      <div>
                        <div className="font-medium">{token.symbol}</div>
                        <div className="text-sm text-gray-400">{token.name}</div>
                      </div>
                    </div>
                    <div className="col-span-2 text-gray-400">{token.chain}</div>
                    <div className="col-span-3 text-right">{token.balance.toFixed(6)}</div>
                    <div className="col-span-3 text-right">${token.valueUsd.toFixed(2)}</div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-400">
                  No tokens match your search.
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <span className="text-lg font-medium mr-2">Selected: {selectedTokenIds.length} tokens</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-gray-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">These tokens will be batched together to save on gas fees.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="text-lg font-medium">Total Value: ${totalSelectedValue}</div>
            </div>
          </div>

          <div className="flex justify-between gap-4">
            <Button 
              className="w-1/2 bg-blue-600 hover:bg-blue-700"
              disabled={selectedTokenIds.length === 0}
              onClick={handleProceed}
            >
              Proceed to Processing
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  )
}