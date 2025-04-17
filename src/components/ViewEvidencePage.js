import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ViewEvidencePage.css';
import WalletConnection from './WalletConnection';
import ipfsService from '../services/ipfsService';
import contractService from '../services/contractService';

function ViewEvidencePage() {
  const navigate = useNavigate();
  const [caseNumber, setCaseNumber] = useState('');
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [evidenceList, setEvidenceList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isViewingEvidence, setIsViewingEvidence] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [contractReady, setContractReady] = useState(false);
  
  const handleWalletConnect = (account, provider, contractInitialized) => {
    setWalletConnected(true);
    setWalletAddress(account);
    setContractReady(contractInitialized);
  };

  const handleSearch = async (e) => {
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
      setIsLoading(true);
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
                uploader: details.uploader
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
              return {
                id: pin.id,
                caseNumber: metadata.keyvalues ? metadata.keyvalues.caseNumber : caseNumber,
                fileType: getFileTypeFromMetadata(metadata),
                fileName: metadata.name || 'Unknown file',
                dateAdded: metadata.keyvalues && metadata.keyvalues.dateAdded 
                  ? new Date(metadata.keyvalues.dateAdded).toLocaleDateString()
                  : 'Unknown date',
                ipfsHash: pin.ipfs_pin_hash
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
      setIsLoading(false);
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
      
      // Record the view on the blockchain
      await contractService.viewEvidence(evidence.ipfsHash, 0); // 0 = Police role
      
      // Open the IPFS gateway URL in a new tab
      const url = ipfsService.getIPFSUrl(evidence.ipfsHash);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error recording evidence view:', error);
      alert('Failed to record view on blockchain, but attempting to open file anyway');
      
      // Still try to open the file
      const url = ipfsService.getIPFSUrl(evidence.ipfsHash);
      window.open(url, '_blank');
    } finally {
      setIsViewingEvidence(false);
    }
  };

  return (
    <div className="view-evidence-container">
      <WalletConnection onConnect={handleWalletConnect} />
      
      <button className="back-button" onClick={() => navigate('/police')}>
        ← Back to Police Dashboard
      </button>
      <h1>View Evidence</h1>
      
      <div className="search-form-container">
        <form onSubmit={handleSearch} className="search-form">
          <div className="form-group">
            <label htmlFor="caseNumber">Enter Case Number:</label>
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
            className="search-button"
            disabled={isLoading || !walletConnected || !contractReady}
          >
            {isLoading ? 'Searching...' : 'Search Evidence'}
          </button>
        </form>
        
        {!walletConnected && (
          <p className="wallet-warning">Please connect your wallet to search evidence</p>
        )}
        
        {walletConnected && !contractReady && (
          <p className="contract-warning">Smart contract not connected. Please check your network.</p>
        )}
        
        {searchError && <p className="search-error">{searchError}</p>}
      </div>
      
      {searchPerformed && (
        <div className="evidence-results">
          <h2>Evidence for Case #{caseNumber}</h2>
          
          {evidenceList.length === 0 ? (
            <p className="no-evidence">No evidence found for this case number.</p>
          ) : (
            <ul className="evidence-list">
              {evidenceList.map(item => (
                <li key={item.id} className="evidence-item">
                  <div className="evidence-type-icon">
                    {item.fileType === 'image' && '🖼️'}
                    {item.fileType === 'document' && '📄'}
                    {item.fileType === 'audio' && '🔊'}
                    {item.fileType === 'video' && '🎬'}
                  </div>
                  <div className="evidence-details">
                    <h3>{item.fileName}</h3>
                    <p>Type: {item.fileType}</p>
                    <p>Date Added: {item.dateAdded}</p>
                    {item.ipfsHash && <p className="ipfs-hash">IPFS: {item.ipfsHash.substring(0, 8)}...</p>}
                    {item.uploader && (
                      <p className="uploader">
                        Uploaded by: {item.uploader.substring(0, 6)}...{item.uploader.substring(item.uploader.length - 4)}
                      </p>
                    )}
                  </div>
                  <button 
                    className="view-button" 
                    onClick={() => handleViewEvidence(item)}
                    disabled={isViewingEvidence}
                  >
                    {isViewingEvidence ? 'Processing...' : 'View'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default ViewEvidencePage; 