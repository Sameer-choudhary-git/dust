// ABI for the DustCollector contract
export const dustCollectorABI = [
    // View functions
    {
      "inputs": [
        {"internalType": "address", "name": "user", "type": "address"},
        {"internalType": "address", "name": "token", "type": "address"}
      ],
      "name": "getUserBalance",
      "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
      "stateMutability": "view",
      "type": "function"
    },
    
    // State changing functions
    {
      "inputs": [
        {"internalType": "address", "name": "token", "type": "address"},
        {"internalType": "uint256", "name": "amount", "type": "uint256"}
      ],
      "name": "depositDust",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {"internalType": "address[]", "name": "tokens", "type": "address[]"},
        {"internalType": "uint256[]", "name": "amounts", "type": "uint256[]"}
      ],
      "name": "batchDeposit",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {"internalType": "address[]", "name": "tokens", "type": "address[]"}
      ],
      "name": "withdrawAsEth",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {"internalType": "address[]", "name": "tokens", "type": "address[]"}
      ],
      "name": "donateAll",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    
    // Events
    {
      "anonymous": false,
      "inputs": [
        {"indexed": true, "internalType": "address", "name": "user", "type": "address"},
        {"indexed": true, "internalType": "address", "name": "token", "type": "address"},
        {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"}
      ],
      "name": "DustReceived",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {"indexed": true, "internalType": "address", "name": "user", "type": "address"},
        {"indexed": true, "internalType": "address", "name": "token", "type": "address"},
        {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"}
      ],
      "name": "DustDonated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {"indexed": true, "internalType": "address", "name": "user", "type": "address"},
        {"indexed": true, "internalType": "address", "name": "token", "type": "address"},
        {"indexed": false, "internalType": "uint256", "name": "tokenAmount", "type": "uint256"},
        {"indexed": false, "internalType": "uint256", "name": "ethReceived", "type": "uint256"}
      ],
      "name": "TokensSwappedToEth",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {"indexed": true, "internalType": "address", "name": "user", "type": "address"},
        {"indexed": false, "internalType": "uint256", "name": "totalEthAmount", "type": "uint256"}
      ],
      "name": "EthWithdrawn",
      "type": "event"
    }
  ] as const;
  
  // Contract type definition
  export type DustCollectorContract = {
    getUserBalance: (user: string, token: string) => Promise<bigint>;
    depositDust: (token: string, amount: bigint) => Promise<void>;
    batchDeposit: (tokens: string[], amounts: bigint[]) => Promise<void>;
    withdrawAsEth: (tokens: string[]) => Promise<void>;
    donateAll: (tokens: string[]) => Promise<void>;
  };