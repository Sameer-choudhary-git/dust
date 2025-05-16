import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("Starting deployment process...");
  
  // Get the donation address from environment variables
  const donationAddress = process.env.DONATION_ADDRESS;
  
  if (!donationAddress) {
    throw new Error("DONATION_ADDRESS not found in environment variables");
  }
  
  // Get the signing account
  console.log("Getting signer...");
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  // Check balance
  console.log("Checking account balance...");
  const balance = await deployer.getBalance();
  console.log("Account balance:", ethers.utils.formatEther(balance), "ETH");
  
  // Get the contract factory - replace with your actual contract name
  const ContractFactory = await ethers.getContractFactory("DustCollector");
  console.log("Contract factory created, starting deployment...");
  
  // Adjust the constructor parameters according to your contract requirements
  console.log("Preparing deployment parameters...");
  const uniswapRouter = process.env.UNISWAP_ROUTER_ADDRESS || "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24";
  console.log("Uniswap Router Address:", uniswapRouter);
  
  try {
    console.log("Deploying contract...");
    const contract = await ContractFactory.deploy(
      donationAddress,
      uniswapRouter
    );
  
    console.log("Transaction hash:", contract.deployTransaction.hash);
    console.log("Waiting for transaction to be mined...");
    await contract.deployed();
    
    console.log("Contract deployed to:", contract.address);
    return contract.address;
  } catch (error) {
    console.error("Deployment error:", error);
    throw error;
  }
}

// Execute the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });