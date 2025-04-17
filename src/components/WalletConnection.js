import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './WalletConnection.css';
import contractService from '../services/contractService';

function WalletConnection({ onConnect }) {
  const [account, setAccount] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [networkName, setNetworkName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [contractInitialized, setContractInitialized] = useState(false);

  const checkIfWalletIsConnected = async () => {
    try {
      const { ethereum } = window;
      if (!ethereum) {
        setErrorMessage('Please install MetaMask!');
        return;
      }

      // Check if we're authorized to access the user's wallet
      const accounts = await ethereum.request({ method: 'eth_accounts' });
      
      if (accounts.length !== 0) {
        const account = accounts[0];
        setAccount(account);
        setIsConnected(true);
        
        // Get network information
        const provider = new ethers.providers.Web3Provider(ethereum);
        const network = await provider.getNetwork();
        setNetworkName(getNetworkName(network.chainId));
        
        // Initialize contract service
        const initialized = await contractService.init(provider);
        setContractInitialized(initialized);
        
        if (onConnect) {
          onConnect(account, provider, initialized);
        }
      }
    } catch (error) {
      console.error(error);
      setErrorMessage('Error connecting to wallet');
    }
  };

  const connectWallet = async () => {
    try {
      const { ethereum } = window;
      if (!ethereum) {
        setErrorMessage('Please install MetaMask!');
        return;
      }

      // Request account access
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      const account = accounts[0];
      setAccount(account);
      setIsConnected(true);
      
      // Get network information
      const provider = new ethers.providers.Web3Provider(ethereum);
      const network = await provider.getNetwork();
      setNetworkName(getNetworkName(network.chainId));
      
      // Initialize contract service
      const initialized = await contractService.init(provider);
      setContractInitialized(initialized);
      
      if (onConnect) {
        onConnect(account, provider, initialized);
      }
    } catch (error) {
      console.error(error);
      setErrorMessage('Error connecting to wallet');
    }
  };

  const getNetworkName = (chainId) => {
    switch (chainId) {
      case 1:
        return 'Mainnet';
      case 11155111:
        return 'Sepolia';
      case 5:
        return 'Goerli';
      case 3:
        return 'Ropsten';
      case 4:
        return 'Rinkeby';
      case 42:
        return 'Kovan';
      default:
        return 'Unknown';
    }
  };

  useEffect(() => {
    checkIfWalletIsConnected();
    
    // Listen for account changes
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', async (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          setIsConnected(true);
          
          // Re-initialize contract if account changes
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          const initialized = await contractService.init(provider);
          setContractInitialized(initialized);
          
          if (onConnect) {
            onConnect(accounts[0], provider, initialized);
          }
        } else {
          setAccount('');
          setIsConnected(false);
          setContractInitialized(false);
        }
      });
      
      // Listen for chain changes
      window.ethereum.on('chainChanged', async () => {
        window.location.reload();
      });
    }
    
    return () => {
      // Clean up event listeners
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', () => {});
        window.ethereum.removeListener('chainChanged', () => {});
      }
    };
  }, []);

  return (
    <div className="wallet-connection">
      {!isConnected ? (
        <button className="connect-button" onClick={connectWallet}>
          Connect Wallet
        </button>
      ) : (
        <div className="wallet-info">
          <span className="network">{networkName}</span>
          <span className="account">
            {account.substring(0, 6)}...{account.substring(account.length - 4)}
          </span>
          {contractInitialized && <span className="contract-status">✓</span>}
        </div>
      )}
      
      {errorMessage && <p className="error-message">{errorMessage}</p>}
    </div>
  );
}

export default WalletConnection; 