import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './MainPage.css';
import WalletConnection from './WalletConnection';

function MainPage() {
  const navigate = useNavigate();
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  
  const handleWalletConnect = (account) => {
    setWalletConnected(true);
    setWalletAddress(account);
  };

  return (
    <div className="main-container">
      <WalletConnection onConnect={handleWalletConnect} />
      
      <h1 className="title">Decentralized Crime Storage</h1>
      <p className="subtitle">Securely store and manage evidence on IPFS</p>
      
      <div className="options-container">
        <div className="option-card" onClick={() => navigate('/police')}>
          <div className="icon">👮</div>
          <h2>Police</h2>
          <p>Access and manage crime records</p>
        </div>
        <div className="option-card" onClick={() => navigate('/judge')}>
          <div className="icon">⚖️</div>
          <h2>Judge</h2>
          <p>Review and process cases</p>
        </div>
      </div>
      
      {walletConnected && (
        <div className="wallet-status">
          Connected as {walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 4)}
        </div>
      )}
    </div>
  );
}

export default MainPage; 