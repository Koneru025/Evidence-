// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract EvidenceTracker {
    enum Role { Police, Judge }
    enum Action { Upload, View }
    
    struct Evidence {
        string ipfsHash;
        string caseNumber;
        address uploader;
        uint256 timestamp;
        bool exists;
    }
    
    struct EvidenceAction {
        string ipfsHash;
        string caseNumber;
        address user;
        Role role;
        Action action;
        uint256 timestamp;
    }
    
    // Store evidence by IPFS hash
    mapping(string => Evidence) public evidenceByHash;
    
    // Store evidence by case number (allows multiple evidence items per case)
    mapping(string => string[]) public evidenceByCaseNumber;
    
    // History of all actions
    EvidenceAction[] public actionHistory;
    
    // Events
    event EvidenceUploaded(string ipfsHash, string caseNumber, address uploader, uint256 timestamp);
    event EvidenceViewed(string ipfsHash, string caseNumber, address viewer, Role role, uint256 timestamp);
    
    /**
     * Upload evidence to the blockchain
     * @param _ipfsHash The IPFS hash of the evidence
     * @param _caseNumber The case number this evidence belongs to
     */
    function uploadEvidence(string memory _ipfsHash, string memory _caseNumber) public {
        require(bytes(_ipfsHash).length > 0, "IPFS hash cannot be empty");
        require(bytes(_caseNumber).length > 0, "Case number cannot be empty");
        require(!evidenceByHash[_ipfsHash].exists, "Evidence with this hash already exists");
        
        // Store the evidence
        evidenceByHash[_ipfsHash] = Evidence({
            ipfsHash: _ipfsHash,
            caseNumber: _caseNumber,
            uploader: msg.sender,
            timestamp: block.timestamp,
            exists: true
        });
        
        // Add to case evidence list
        evidenceByCaseNumber[_caseNumber].push(_ipfsHash);
        
        // Store the action
        actionHistory.push(EvidenceAction({
            ipfsHash: _ipfsHash,
            caseNumber: _caseNumber,
            user: msg.sender,
            role: Role.Police, // Assuming uploaders are always police
            action: Action.Upload,
            timestamp: block.timestamp
        }));
        
        // Emit event
        emit EvidenceUploaded(_ipfsHash, _caseNumber, msg.sender, block.timestamp);
    }
    
    /**
     * Record that evidence has been viewed
     * @param _ipfsHash The IPFS hash of the evidence
     * @param _role The role of the viewer (Police or Judge)
     */
    function viewEvidence(string memory _ipfsHash, Role _role) public {
        require(bytes(_ipfsHash).length > 0, "IPFS hash cannot be empty");
        require(evidenceByHash[_ipfsHash].exists, "Evidence with this hash does not exist");
        
        string memory caseNumber = evidenceByHash[_ipfsHash].caseNumber;
        
        // Store the action
        actionHistory.push(EvidenceAction({
            ipfsHash: _ipfsHash,
            caseNumber: caseNumber,
            user: msg.sender,
            role: _role,
            action: Action.View,
            timestamp: block.timestamp
        }));
        
        // Emit event
        emit EvidenceViewed(_ipfsHash, caseNumber, msg.sender, _role, block.timestamp);
    }
    
    /**
     * Get all evidence hashes for a case number
     * @param _caseNumber The case number to get evidence for
     * @return An array of IPFS hashes
     */
    function getEvidenceForCase(string memory _caseNumber) public view returns (string[] memory) {
        return evidenceByCaseNumber[_caseNumber];
    }
    
    /**
     * Get details about a specific piece of evidence
     * @param _ipfsHash The IPFS hash to get details for
     * @return ipfsHash, caseNumber, uploader, timestamp
     */
    function getEvidenceDetails(string memory _ipfsHash) public view returns (
        string memory ipfsHash,
        string memory caseNumber,
        address uploader,
        uint256 timestamp
    ) {
        require(evidenceByHash[_ipfsHash].exists, "Evidence with this hash does not exist");
        Evidence memory evidence = evidenceByHash[_ipfsHash];
        return (
            evidence.ipfsHash,
            evidence.caseNumber,
            evidence.uploader,
            evidence.timestamp
        );
    }
    
    /**
     * Get the total number of actions in the history
     * @return The total number of actions
     */
    function getActionHistoryCount() public view returns (uint256) {
        return actionHistory.length;
    }
} 