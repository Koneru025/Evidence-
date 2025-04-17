import axios from 'axios';

const PINATA_API_KEY = process.env.REACT_APP_PINATA_API_KEY;
const PINATA_SECRET_API_KEY = process.env.REACT_APP_PINATA_SECRET_API_KEY;

/**
 * Service for interacting with IPFS via Pinata
 */
class IPFSService {
  constructor() {
    this.pinataEndpoint = 'https://api.pinata.cloud/pinning/pinFileToIPFS';
    this.gateway = 'https://gateway.pinata.cloud/ipfs/';
    this.headers = {
      'pinata_api_key': PINATA_API_KEY,
      'pinata_secret_api_key': PINATA_SECRET_API_KEY
    };
  }

  /**
   * Upload a file to IPFS via Pinata
   * 
   * @param {File} file - The file to upload
   * @param {string} name - Name for the file metadata
   * @param {string} caseNumber - Case number for the metadata
   * @returns {Promise<string>} - The IPFS hash of the uploaded file
   */
  async uploadFile(file, name, caseNumber) {
    if (!PINATA_API_KEY || !PINATA_SECRET_API_KEY) {
      throw new Error('Pinata API keys not found in environment variables');
    }

    // Create a FormData object to send the file
    const formData = new FormData();
    formData.append('file', file);

    // Add metadata
    const metadata = JSON.stringify({
      name,
      keyvalues: {
        caseNumber,
        dateAdded: new Date().toISOString(),
        fileType: file.type
      }
    });
    formData.append('pinataMetadata', metadata);

    // Configure pinning options
    const pinataOptions = JSON.stringify({
      cidVersion: 1,
      wrapWithDirectory: false
    });
    formData.append('pinataOptions', pinataOptions);

    try {
      // Send the request to Pinata
      const response = await axios.post(
        this.pinataEndpoint,
        formData,
        {
          maxBodyLength: 'Infinity',
          headers: {
            'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
            ...this.headers
          }
        }
      );

      return response.data.IpfsHash;
    } catch (error) {
      console.error('Error uploading to IPFS:', error);
      throw error;
    }
  }

  /**
   * Get the URL for an IPFS hash
   * 
   * @param {string} hash - The IPFS hash 
   * @returns {string} - The URL to access the content
   */
  getIPFSUrl(hash) {
    // Normalize CID - remove ipfs:// prefix if present
    if (hash.startsWith('ipfs://')) {
      hash = hash.substring(7);
    }
    
    return `${this.gateway}${hash}`;
  }

  /**
   * Get all pins (files) associated with the Pinata account
   * Can be filtered by metadata
   * 
   * @param {Object} filters - Optional filters for the query
   * @returns {Promise<Array>} - Array of pin objects
   */
  async getPins(filters = {}) {
    try {
      let queryParams = new URLSearchParams();
      
      if (filters.caseNumber) {
        // Use exact match for case number
        queryParams.append('metadata[keyvalues][caseNumber]', filters.caseNumber);
        queryParams.append('metadata[keyvalues][caseNumber][value]', filters.caseNumber);
        queryParams.append('metadata[keyvalues][caseNumber][op]', 'eq');
      }
      
      // Set a reasonable limit
      queryParams.append('limit', 100);
      
      // Including metadata is crucial for filtering
      queryParams.append('includeMetadata', 'true');
      
      // Make API request
      const response = await axios.get(
        `https://api.pinata.cloud/data/pinList?${queryParams.toString()}`,
        { headers: this.headers }
      );
      
      // Check if we got valid data
      if (!response.data || !response.data.rows) {
        throw new Error('Invalid response from Pinata API');
      }
      
      return response.data.rows;
    } catch (error) {
      console.error('Error fetching pins from IPFS:', error);
      throw error;
    }
  }
  
  /**
   * Directly retrieve file metadata for a specific IPFS hash
   * 
   * @param {string} ipfsHash - The IPFS hash to query
   * @returns {Promise<Object>} - The metadata for the file
   */
  async getPinMetadata(ipfsHash) {
    try {
      // Remove ipfs:// prefix if present
      if (ipfsHash.startsWith('ipfs://')) {
        ipfsHash = ipfsHash.substring(7);
      }
      
      // Extract just the CID if there's a path component
      ipfsHash = ipfsHash.split('/')[0];
      
      const response = await axios.get(
        `https://api.pinata.cloud/data/pinList?hashContains=${ipfsHash}&includeMetadata=true`,
        { headers: this.headers }
      );
      
      if (!response.data || !response.data.rows || response.data.rows.length === 0) {
        throw new Error('No pin found with that hash');
      }
      
      return response.data.rows[0];
    } catch (error) {
      console.error('Error fetching pin metadata:', error);
      throw error;
    }
  }
  
  /**
   * Check if a file exists on IPFS by hash
   * 
   * @param {string} ipfsHash - The IPFS hash to check
   * @returns {Promise<boolean>} - Whether the file exists
   */
  async checkFileExists(ipfsHash) {
    try {
      const url = this.getIPFSUrl(ipfsHash);
      const response = await axios.head(url);
      return response.status === 200;
    } catch (error) {
      console.error('Error checking if file exists:', error);
      return false;
    }
  }
  
  /**
   * Get direct content from IPFS (for non-binary data like JSON)
   * 
   * @param {string} ipfsHash - The IPFS hash to retrieve
   * @returns {Promise<any>} - The content from IPFS
   */
  async getContent(ipfsHash) {
    try {
      const url = this.getIPFSUrl(ipfsHash);
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error('Error getting content from IPFS:', error);
      throw error;
    }
  }
}

export default new IPFSService(); 