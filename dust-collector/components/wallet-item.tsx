"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Wallet, AlertCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

// Base Network Parameters
const BASE_SEPOLIA_CHAIN_ID = "0x14a34" // Chain ID for Base Sepolia testnet in hex (84532)
const BASE_SEPOLIA_RPC_URL = "https://sepolia.base.org"

export default function WalletConnectButton() {
  const [open, setOpen] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [account, setAccount] = useState(null)
  const [connectionStatus, setConnectionStatus] = useState('')
  const [error, setError] = useState('')

  // Check if wallet is already connected on component mount
  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ 
            method: 'eth_accounts' 
          })
          
          if (accounts.length > 0) {
            const chainId = await window.ethereum.request({ 
              method: 'eth_chainId' 
            })
            
            if (chainId === BASE_SEPOLIA_CHAIN_ID) {
              setAccount(accounts[0])
              setConnectionStatus('Connected to Base Sepolia')
            }
          }
        } catch (error) {
          console.error("Error checking existing connection:", error)
        }
      }
    }
    
    checkConnection()
  }, [])

  // Function to connect to Base wallet
  const connectBaseWallet = async () => {
    setConnecting(true)
    setError('')
    
    // Check if MetaMask or another web3 provider is available
    if (window.ethereum) {
      try {
        // Request account access
        const accounts = await window.ethereum.request({ 
          method: 'eth_requestAccounts' 
        })
        
        // Get the current chain ID
        const chainId = await window.ethereum.request({ 
          method: 'eth_chainId' 
        })
        
        // Check if we're already on Base Sepolia network
        if (chainId !== BASE_SEPOLIA_CHAIN_ID) {
          try {
            // Try to switch to Base Sepolia network
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: BASE_SEPOLIA_CHAIN_ID }],
            })
          } catch (switchError) {
            // This error code indicates that the chain has not been added to the wallet
            if (switchError.code === 4902) {
              try {
                await window.ethereum.request({
                  method: 'wallet_addEthereumChain',
                  params: [
                    {
                      chainId: BASE_SEPOLIA_CHAIN_ID,
                      chainName: 'Base Sepolia',
                      nativeCurrency: {
                        name: 'ETH',
                        symbol: 'ETH',
                        decimals: 18
                      },
                      rpcUrls: [BASE_SEPOLIA_RPC_URL],
                      blockExplorerUrls: ['https://sepolia.basescan.org'],
                    },
                  ],
                })
                
                // Try connecting again after adding the network
                return connectBaseWallet()
              } catch (addError) {
                console.error('Error adding Base network:', addError)
                setError('Failed to add Base network to your wallet')
                setConnecting(false)
                return false
              }
            } else {
              console.error('Error switching to Base network:', switchError)
              setError('Failed to switch to Base network')
              setConnecting(false)
              return false
            }
          }
        }
        
        setAccount(accounts[0])
        setConnectionStatus('Connected to Base Sepolia')
        setConnecting(false)
        setOpen(false) // Close dialog on successful connection
        return true
      } catch (error) {
        console.error('Error connecting to Base wallet:', error)
        setError('Error connecting wallet. Please try again.')
        setConnecting(false)
        return false
      }
    } else {
      setError('No Ethereum wallet detected. Please install MetaMask or use a compatible browser wallet.')
      setConnecting(false)
      return false
    }
  }

  // Format account address for display
  const formatAddress = (address) => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={account ? "default" : "outline"} 
          className="flex items-center gap-2 text-base py-2 px-4"
        >
          <Wallet className="h-5 w-5" />
          {account ? formatAddress(account) : "Connect Base Wallet"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Connect Base Wallet</DialogTitle>
          <DialogDescription className="text-base">
            Connect your Base wallet to start collecting dust
          </DialogDescription>
        </DialogHeader>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex items-center mb-4">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>{error}</span>
          </div>
        )}
        
        <div className="grid gap-4 py-4">
          {/* Base Wallet Option */}
          <Button 
            variant="outline" 
            className="flex items-center justify-between p-4 h-auto"
            onClick={connectBaseWallet}
            disabled={connecting}
          >
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-blue-500 mr-3 flex items-center justify-center text-base text-white">
                B
              </div>
              <div className="text-left">
                <div className="font-medium text-base">Base</div>
                <div className="text-sm text-gray-400">Connect to your Base wallet</div>
              </div>
            </div>
            <div className="text-sm bg-blue-600 px-3 py-1 rounded text-white">Base Sepolia</div>
          </Button>
        </div>
        
        {connecting && (
          <div className="text-center py-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2">Connecting...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
