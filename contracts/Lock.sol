// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

// Uniswap V2 Router interface for swapping tokens
interface IUniswapV2Router {
    function swapExactTokensForETH(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    
    function WETH() external pure returns (address);
}

contract DustCollector {
    address public owner;
    address public donationAddress;
    IUniswapV2Router public uniswapRouter;
    mapping(address => mapping(address => uint256)) public userBalances; // user => token => amount
    
    event DustReceived(address indexed user, address indexed token, uint256 amount);
    event DustDonated(address indexed user, address indexed token, uint256 amount);
    event TokensSwappedToEth(address indexed user, address indexed token, uint256 tokenAmount, uint256 ethReceived);
    event EthWithdrawn(address indexed user, uint256 totalEthAmount);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    constructor(address _donationAddress, address _uniswapRouter) {
        owner = msg.sender;
        donationAddress = _donationAddress;
        uniswapRouter = IUniswapV2Router(_uniswapRouter);
    }
    
    // Deposit a single token
    function depositDust(address token, uint256 amount) external {
        require(IERC20(token).transferFrom(msg.sender, address(this), amount), "Transfer failed");
        userBalances[msg.sender][token] += amount;
        emit DustReceived(msg.sender, token, amount);
    }
    
    // Deposit multiple tokens in one go
    function batchDeposit(address[] calldata tokens, uint256[] calldata amounts) external {
        require(tokens.length == amounts.length, "Length mismatch");
        for (uint256 i = 0; i < tokens.length; i++) {
            require(IERC20(tokens[i]).transferFrom(msg.sender, address(this), amounts[i]), "Transfer failed");
            userBalances[msg.sender][tokens[i]] += amounts[i];
            emit DustReceived(msg.sender, tokens[i], amounts[i]);
        }
    }
    
    // Withdraw all dust as ETH (swap all tokens to ETH and send to user)
    function withdrawAsEth(address[] calldata tokens) external {
        uint256 totalEthReceived = 0;
        
        for (uint256 i = 0; i < tokens.length; i++) {
            address token = tokens[i];
            uint256 amount = userBalances[msg.sender][token];
            
            if (amount > 0) {
                // Reset user balance before swap
                userBalances[msg.sender][token] = 0;
                
                // Approve router to spend token
                require(IERC20(token).approve(address(uniswapRouter), amount), "Approval failed");
                
                // Set up the swap path
                address[] memory path = new address[](2);
                path[0] = token;
                path[1] = uniswapRouter.WETH();
                
                // Store ETH balance before swap
                uint256 ethBefore = address(this).balance;
                
                // Execute the swap
                uint256 deadline = block.timestamp + 300; // 5 minutes
                uniswapRouter.swapExactTokensForETH(
                    amount,
                    0, // No minimum output for simplicity
                    path,
                    address(this),
                    deadline
                );
                
                // Calculate received ETH
                uint256 ethReceived = address(this).balance - ethBefore;
                totalEthReceived += ethReceived;
                
                emit TokensSwappedToEth(msg.sender, token, amount, ethReceived);
            }
        }
        
        // Send all accumulated ETH to user
        require(totalEthReceived > 0, "No ETH received from swaps");
        (bool success, ) = payable(msg.sender).call{value: totalEthReceived}("");
        require(success, "ETH transfer failed");
        
        emit EthWithdrawn(msg.sender, totalEthReceived);
    }
    
    // Donate all of user's dust tokens to the donation address
    function donateAll(address[] calldata tokens) external {
        for (uint256 i = 0; i < tokens.length; i++) {
            address token = tokens[i];
            uint256 amount = userBalances[msg.sender][token];
            
            if (amount > 0) {
                userBalances[msg.sender][token] = 0;
                require(IERC20(token).transfer(donationAddress, amount), "Donation failed");
                emit DustDonated(msg.sender, token, amount);
            }
        }
    }
    
    // Get user's balance for a specific token
    function getUserBalance(address user, address token) external view returns (uint256) {
        return userBalances[user][token];
    }
    
    // Change donation address
    function setDonationAddress(address newAddress) external onlyOwner {
        donationAddress = newAddress;
    }
    
    // To receive ETH from swapExactTokensForETH
    receive() external payable {}
}