import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './JudgePage.css';
import WalletConnection from './WalletConnection';
import ipfsService from '../services/ipfsService';
import contractService from '../services/contractService';

function JudgePage() {
  const navigate = useNavigate();
  const [caseNumber, setCaseNumber] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isViewingEvidence, setIsViewingEvidence] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [evidenceList, setEvidenceList] = useState([]);
  const [viewedEvidence, setViewedEvidence] = useState({});
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [contractReady, setContractReady] = useState(false);
  const [actionHistory, setActionHistory] = useState([]);

  const handleWalletConnect = (account, provider, contractInitialized) => {
    setWalletConnected(true);
    setWalletAddress(account);
    setContractReady(contractInitialized);
  };

  // Load previously viewed evidence from local storage
  useEffect(() => {
    const loadViewedEvidence = () => {
      try {
        const storedData = localStorage.getItem('viewedEvidence');
        if (storedData) {
          setViewedEvidence(JSON.parse(storedData));
        }
      } catch (error) {
        console.error('Error loading viewed evidence from storage:', error);
      }
    };
    
    loadViewedEvidence();
  }, []);

  // Save viewed evidence to local storage when updated
  useEffect(() => {
    if (Object.keys(viewedEvidence).length > 0) {
      try {
        localStorage.setItem('viewedEvidence', JSON.stringify(viewedEvidence));
      } catch (error) {
        console.error('Error saving viewed evidence to storage:', error);
      }
    }
  }, [viewedEvidence]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!walletConnected) {
      setSearchError('Please connect your wallet first');
      return;
    }
    
    if (!contractReady) {
      setSearchError('Smart contract not initialized. Please check your network.');
      return;
    }
    
    try {
      setIsSearching(true);
      setSearchError('');
      
      // First, try to get evidence hashes from the blockchain
      const ipfsHashes = await contractService.getEvidenceForCase(caseNumber);
      
      if (ipfsHashes && ipfsHashes.length > 0) {
        // We have evidence on the blockchain for this case
        const evidenceDetails = await Promise.all(
          ipfsHashes.map(async (hash) => {
            try {
              // Get details from blockchain
              const details = await contractService.getEvidenceDetails(hash);
              
              // Try to get additional metadata from IPFS/Pinata if available
              let fileType = 'document';
              let fileName = 'evidence.file';
              
              try {
                const pinMetadata = await ipfsService.getPinMetadata(hash);
                if (pinMetadata && pinMetadata.metadata) {
                  fileName = pinMetadata.metadata.name || fileName;
                  if (pinMetadata.metadata.keyvalues && pinMetadata.metadata.keyvalues.fileType) {
                    // Determine file type from mime type
                    const mimeType = pinMetadata.metadata.keyvalues.fileType;
                    if (mimeType.startsWith('image/')) fileType = 'image';
                    else if (mimeType.startsWith('audio/')) fileType = 'audio';
                    else if (mimeType.startsWith('video/')) fileType = 'video';
                    else fileType = 'document';
                  }
                }
              } catch (metadataError) {
                console.warn('Could not get IPFS metadata:', metadataError);
                // Continue without the metadata
              }
              
              return {
                id: hash,
                ipfsHash: hash,
                caseNumber: details.caseNumber,
                fileName: fileName,
                fileType: fileType,
                dateAdded: new Date(details.timestamp).toLocaleDateString(),
                uploader: details.uploader,
                viewed: viewedEvidence[hash] ? true : false
              };
            } catch (detailsError) {
              console.error('Error getting details for hash:', hash, detailsError);
              return null;
            }
          })
        );
        
        // Filter out any null values (failed to get details)
        const validEvidence = evidenceDetails.filter(item => item !== null);
        
        setEvidenceList(validEvidence);
        setSearchPerformed(true);
      } else {
        // Try to get from Pinata as fallback
        console.log('No evidence found on blockchain, trying Pinata...');
        
        try {
          const pins = await ipfsService.getPins({ caseNumber });
          
          if (pins && pins.length > 0) {
            // Transform pins to our evidence list format
            const fetchedEvidence = pins.map(pin => {
              const metadata = pin.metadata;
              const hash = pin.ipfs_pin_hash;
              return {
                id: pin.id,
                caseNumber: metadata.keyvalues ? metadata.keyvalues.caseNumber : caseNumber,
                fileType: getFileTypeFromMetadata(metadata),
                fileName: metadata.name || 'Unknown file',
                dateAdded: metadata.keyvalues && metadata.keyvalues.dateAdded 
                  ? new Date(metadata.keyvalues.dateAdded).toLocaleDateString()
                  : 'Unknown date',
                ipfsHash: hash,
                viewed: viewedEvidence[hash] ? true : false
              };
            });
            
            setEvidenceList(fetchedEvidence);
          } else {
            // No evidence found in Pinata either
            setEvidenceList([]);
          }
        } catch (pinataError) {
          console.error('Error searching Pinata:', pinataError);
          setEvidenceList([]);
        }
        
        setSearchPerformed(true);
      }
    } catch (error) {
      console.error('Error searching for evidence:', error);
      setSearchError('Error searching for evidence: ' + error.message);
      setEvidenceList([]);
      setSearchPerformed(true);
    } finally {
      setIsSearching(false);
    }
  };
  
  const getFileTypeFromMetadata = (metadata) => {
    if (!metadata.keyvalues || !metadata.keyvalues.fileType) {
      return 'document';
    }
    
    const mimeType = metadata.keyvalues.fileType;
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.startsWith('video/')) return 'video';
    return 'document';
  };
  
  const handleViewEvidence = async (evidence) => {
    if (!evidence.ipfsHash) {
      alert('This evidence does not have a valid IPFS hash');
      return;
    }
    
    try {
      setIsViewingEvidence(true);
      
      // Record the view on the blockchain (1 = Judge role)
      const result = await contractService.viewEvidence(evidence.ipfsHash, 1);
      
      // Update the local state to mark this evidence as viewed
      setViewedEvidence(prev => ({
        ...prev,
        [evidence.ipfsHash]: {
          timestamp: new Date().toISOString(),
          transactionHash: result.transactionHash,
          fileName: evidence.fileName
        }
      }));
      
      // Update the evidence list to reflect the viewed status
      setEvidenceList(prev => prev.map(item => 
        item.ipfsHash === evidence.ipfsHash 
          ? { ...item, viewed: true } 
          : item
      ));
      
      // Add to action history
      setActionHistory(prev => [
        {
          action: 'Viewed',
          ipfsHash: evidence.ipfsHash,
          fileName: evidence.fileName,
          timestamp: new Date().toISOString(),
          transactionHash: result.transactionHash
        },
        ...prev
      ]);
      
      // Try to get content directly from IPFS using the reliable gateway
      try {
        // Normalize IPFS hash format if needed (for CIDs like bafkreih...)
        let ipfsHash = evidence.ipfsHash;
        if (ipfsHash.startsWith('ipfs://')) {
          ipfsHash = ipfsHash.substring(7);
        }
        
        // Get the IPFS URL
        const url = ipfsService.getIPFSUrl(ipfsHash);
        console.log('Opening evidence URL:', url);
        
        // Check if this is viewable in browser
        if (evidence.fileType === 'image' || 
            evidence.fileType === 'audio' || 
            evidence.fileType === 'video' || 
            evidence.fileName.endsWith('.pdf')) {
          // Open directly in browser
          window.open(url, '_blank');
        } else {
          // For other file types, we need to download them
          const link = document.createElement('a');
          link.href = url;
          link.download = evidence.fileName || 'evidence-file';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } catch (contentError) {
        console.error('Error accessing file content:', contentError);
        alert('Could not access file content. It may be unavailable or restricted.');
        
        // Try simple fallback
        const directUrl = ipfsService.getIPFSUrl(evidence.ipfsHash);
        window.open(directUrl, '_blank');
      }
    } catch (error) {
      console.error('Error recording evidence view:', error);
      
      if (error.message.includes('user rejected transaction')) {
        alert('Transaction was rejected in wallet. Evidence view not recorded.');
      } else {
        alert('Failed to record view on blockchain, but attempting to open file anyway');
        
        // Still try to open the file even if blockchain recording failed
        try {
          const url = ipfsService.getIPFSUrl(evidence.ipfsHash);
          window.open(url, '_blank');
        } catch (fallbackError) {
          console.error('Error in fallback file opening:', fallbackError);
          alert('Could not open file.');
        }
      }
    } finally {
      setIsViewingEvidence(false);
    }
  };

  return (
    <div className="judge-container">
      <WalletConnection onConnect={handleWalletConnect} />
      
      <button className="back-button" onClick={() => navigate('/')}>
        ← Back to Home
      </button>
      <h1>Judge Dashboard</h1>
      
      <div className="case-form-container">
        <h2>Enter Case Number</h2>
        <form onSubmit={handleSubmit} className="case-form">
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
          
          <button 
            type="submit" 
            className="submit-button"
            disabled={isSearching || !walletConnected || !contractReady}
          >
            {isSearching ? 'Searching...' : 'View Case'}
          </button>
        </form>
        
        {!walletConnected && (
          <p className="wallet-warning">Please connect your wallet to view cases</p>
        )}
        
        {walletConnected && !contractReady && (
          <p className="contract-warning">Smart contract not connected. Please check your network.</p>
        )}
        
        {searchError && <p className="search-error">{searchError}</p>}
      </div>
      
      {searchPerformed && evidenceList.length > 0 && (
        <div className="case-evidence-container">
          <h2>Evidence for Case #{caseNumber}</h2>
          <div className="evidence-summary">
            <p>Total Evidence: {evidenceList.length}</p>
            <p>Reviewed: {evidenceList.filter(e => e.viewed).length} / {evidenceList.length}</p>
          </div>
          <div className="evidence-items">
            {evidenceList.map(item => (
              <div key={item.id} className={`evidence-card ${item.viewed ? 'viewed' : ''}`}>
                {item.viewed && <div className="viewed-badge">✓ Reviewed</div>}
                <div className="evidence-icon">
                  {item.fileType === 'image' && '🖼️'}
                  {item.fileType === 'document' && '📄'}
                  {item.fileType === 'audio' && '🔊'}
                  {item.fileType === 'video' && '🎬'}
                </div>
                <h3>{item.fileName}</h3>
                <p>Added: {item.dateAdded}</p>
                {item.uploader && (
                  <p className="uploader">
                    Police ID: {item.uploader.substring(0, 6)}...{item.uploader.substring(item.uploader.length - 4)}
                  </p>
                )}
                <button 
                  className={`view-evidence-button ${item.viewed ? 'viewed-button' : ''}`}
                  onClick={() => handleViewEvidence(item)}
                  disabled={isViewingEvidence}
                >
                  {isViewingEvidence ? 'Processing...' : item.viewed ? 'Review Again' : 'Review Evidence'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {searchPerformed && evidenceList.length === 0 && (
        <div className="no-evidence-container">
          <h2>No evidence found for Case #{caseNumber}</h2>
        </div>
      )}
      
      {actionHistory.length > 0 && (
        <div className="action-history-container">
          <h2>Recent Activity</h2>
          <div className="action-history-list">
            {actionHistory.slice(0, 5).map((action, index) => (
              <div key={index} className="action-history-item">
                <p>
                  <strong>{action.action}:</strong> {action.fileName}
                  <span className="action-timestamp">
                    {new Date(action.timestamp).toLocaleString()}
                  </span>
                </p>
                <p className="transaction-hash">
                  TX: {action.transactionHash.substring(0, 6)}...{action.transactionHash.substring(action.transactionHash.length - 4)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default JudgePage; 