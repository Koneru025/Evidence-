import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AddEvidencePage.css';
import WalletConnection from './WalletConnection';
import ipfsService from '../services/ipfsService';
import contractService from '../services/contractService';

function AddEvidencePage() {
  const navigate = useNavigate();
  const [caseNumber, setCaseNumber] = useState('');
  const [fileFormat, setFileFormat] = useState('image');
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [provider, setProvider] = useState(null);
  const [contractReady, setContractReady] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  
  const handleWalletConnect = (account, provider, contractInitialized) => {
    setWalletConnected(true);
    setWalletAddress(account);
    setProvider(provider);
    setContractReady(contractInitialized);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!walletConnected) {
      setUploadError('Please connect your wallet first');
      return;
    }
    
    if (!contractReady) {
      setUploadError('Smart contract not initialized. Please check your network.');
      return;
    }
    
    if (!file) {
      setUploadError('Please select a file to upload');
      return;
    }
    
    try {
      setIsUploading(true);
      setUploadError('');
      setUploadStatus('Uploading to IPFS...');
      
      // Upload to IPFS
      const fileName = file.name;
      const ipfsHash = await ipfsService.uploadFile(file, fileName, caseNumber);
      
      console.log('File uploaded to IPFS with hash:', ipfsHash);
      console.log('File can be viewed at:', ipfsService.getIPFSUrl(ipfsHash));
      
      // Now record on blockchain
      setUploadStatus('Recording on blockchain...');
      const result = await contractService.uploadEvidence(ipfsHash, caseNumber);
      
      console.log('Blockchain transaction successful:', result);
      
      // Success!
      setUploadStatus('Success!');
      alert(`Evidence uploaded successfully!
IPFS Hash: ${ipfsHash}
Uploader: ${walletAddress}
Transaction Hash: ${result.transactionHash}`);
      
      navigate('/police');
    } catch (error) {
      console.error('Error uploading evidence:', error);
      if (error.message.includes('user rejected transaction')) {
        setUploadError('Transaction rejected in MetaMask');
      } else if (error.message.includes('IPFS')) {
        setUploadError('Error uploading to IPFS: ' + error.message);
      } else {
        setUploadError('Error: ' + error.message);
      }
      setUploadStatus('');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="add-evidence-container">
      <WalletConnection onConnect={handleWalletConnect} />
      
      <button className="back-button" onClick={() => navigate('/police')}>
        ← Back to Police Dashboard
      </button>
      <h1>Add New Evidence</h1>
      
      <div className="evidence-form-container">
        <form onSubmit={handleSubmit} className="evidence-form">
          <div className="form-group">
            <label htmlFor="caseNumber">Case Number:</label>
            <input
              type="text"
              id="caseNumber"
              value={caseNumber}
              onChange={(e) => setCaseNumber(e.target.value)}
              placeholder="Enter case number"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="fileFormat">File Format:</label>
            <select
              id="fileFormat"
              value={fileFormat}
              onChange={(e) => setFileFormat(e.target.value)}
              required
            >
              <option value="image">Image</option>
              <option value="document">Document</option>
              <option value="audio">Audio</option>
              <option value="video">Video</option>
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="file">Upload File:</label>
            <input
              type="file"
              id="file"
              onChange={(e) => setFile(e.target.files[0])}
              required
              accept={fileFormat === 'image' ? 'image/*' : 
                      fileFormat === 'document' ? '.pdf,.doc,.docx,.txt' : 
                      fileFormat === 'audio' ? 'audio/*' : 
                      'video/*'}
            />
          </div>
          
          {!walletConnected && (
            <p className="wallet-warning">Please connect your wallet to upload evidence</p>
          )}
          
          {walletConnected && !contractReady && (
            <p className="contract-warning">Smart contract not connected. Please check your network.</p>
          )}
          
          {uploadError && <p className="upload-error">{uploadError}</p>}
          
          {uploadStatus && <p className="upload-status">{uploadStatus}</p>}
          
          <button 
            type="submit" 
            className="submit-button" 
            disabled={isUploading || !walletConnected || !contractReady}
          >
            {isUploading ? 'Processing...' : 'Upload Evidence'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AddEvidencePage; 