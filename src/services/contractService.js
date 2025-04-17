import { ethers } from 'ethers';
import EvidenceTrackerABI from '../contracts/EvidenceTracker.json';

// Contract address on Sepolia testnet 
// Note: You'll need to replace this with your actual deployed contract address
const CONTRACT_ADDRESS = "0x5a77e5a8d73d13f1fa12acef50900cf65c4b0db9"; 

class ContractService {
  constructor() {
    this.contract = null;
    this.signer = null;
  }

  /**
   * Initialize the contract with a provider/signer
   * @param {Object} provider - The ethers.js provider or signer
   */
  async init(provider) {
    try {
      this.signer = provider.getSigner();
      this.contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        EvidenceTrackerABI,
        this.signer
      );
      return true;
    } catch (error) {
      console.error("Failed to initialize contract:", error);
      return false;
    }
  }

  /**
   * Check if the contract service has been initialized
   */
  isInitialized() {
    return this.contract !== null && this.signer !== null;
  }

  /**
   * Upload evidence to the blockchain
   * @param {string} ipfsHash - The IPFS hash of the evidence
   * @param {string} caseNumber - The case number this evidence belongs to
   */
  async uploadEvidence(ipfsHash, caseNumber) {
    if (!this.isInitialized()) {
      throw new Error("Contract service not initialized");
    }

    try {
      const tx = await this.contract.uploadEvidence(ipfsHash, caseNumber);
      const receipt = await tx.wait();
      return {
        success: true,
        transactionHash: receipt.transactionHash,
        events: receipt.events
      };
    } catch (error) {
      console.error("Error uploading evidence to blockchain:", error);
      throw error;
    }
  }

  /**
   * Record viewing of evidence
   * @param {string} ipfsHash - The IPFS hash of the evidence
   * @param {number} role - 0 for Police, 1 for Judge
   */
  async viewEvidence(ipfsHash, role) {
    if (!this.isInitialized()) {
      throw new Error("Contract service not initialized");
    }

    try {
      const tx = await this.contract.viewEvidence(ipfsHash, role);
      const receipt = await tx.wait();
      return {
        success: true,
        transactionHash: receipt.transactionHash,
        events: receipt.events
      };
    } catch (error) {
      console.error("Error recording evidence view on blockchain:", error);
      throw error;
    }
  }

  /**
   * Get all evidence for a case
   * @param {string} caseNumber - The case number to get evidence for
   */
  async getEvidenceForCase(caseNumber) {
    if (!this.isInitialized()) {
      throw new Error("Contract service not initialized");
    }

    try {
      const ipfsHashes = await this.contract.getEvidenceForCase(caseNumber);
      return ipfsHashes;
    } catch (error) {
      console.error("Error getting evidence from blockchain:", error);
      throw error;
    }
  }

  /**
   * Get details for a specific piece of evidence
   * @param {string} ipfsHash - The IPFS hash to get details for
   */
  async getEvidenceDetails(ipfsHash) {
    if (!this.isInitialized()) {
      throw new Error("Contract service not initialized");
    }

    try {
      const details = await this.contract.getEvidenceDetails(ipfsHash);
      return {
        ipfsHash: details[0],
        caseNumber: details[1],
        uploader: details[2],
        timestamp: new Date(details[3].toNumber() * 1000) // Convert from Unix timestamp
      };
    } catch (error) {
      console.error("Error getting evidence details from blockchain:", error);
      throw error;
    }
  }
}

export default new ContractService(); 