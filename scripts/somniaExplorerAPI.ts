import axios from "axios";
import { ethers } from "ethers";

/**
 * Shannon Explorer API Client (CORRECT Implementation)
 * Base URL: https://somnia.w3us.site/api/v2/
 * Based on actual API discovery - REST-style endpoints
 */
export class ShannonExplorerAPI {
  private baseURL: string;

  constructor() {
    this.baseURL = "https://somnia.w3us.site/api/v2";
  }

  private async makeRequest(endpoint: string, params: Record<string, any> = {}) {
    try {
      const config = {
        baseURL: this.baseURL,
        params: params,
        timeout: 15000,
      };

      const response = await axios.get(endpoint, config);
      return response.data;
    } catch (error: any) {
      console.error(`Shannon API request failed for ${endpoint}:`, error.message);
      throw error;
    }
  }

  // ========== TRANSACTIONS API ==========
  async getTransactions(limit: number = 50, page?: string) {
    const params: any = { limit };
    if (page) params.page = page;
    
    return this.makeRequest("/transactions", params);
  }

  async getTransactionByHash(hash: string) {
    return this.makeRequest(`/transactions/${hash}`);
  }

  // ========== BLOCKS API ==========  
  async getBlocks(limit: number = 50, page?: string) {
    const params: any = { limit };
    if (page) params.page = page;
    
    return this.makeRequest("/blocks", params);
  }

  async getBlockByNumber(blockNumber: number | string) {
    return this.makeRequest(`/blocks/${blockNumber}`);
  }

  async getBlockByHash(hash: string) {
    return this.makeRequest(`/blocks/${hash}`);
  }

  // ========== ADDRESSES API ==========
  async getAddresses(limit: number = 50, page?: string) {
    const params: any = { limit };
    if (page) params.page = page;
    
    return this.makeRequest("/addresses", params);
  }

  async getAddressInfo(address: string) {
    return this.makeRequest(`/addresses/${address}`);
  }

  async getAddressTransactions(address: string, limit: number = 50, page?: string) {
    const params: any = { limit };
    if (page) params.page = page;
    
    return this.makeRequest(`/addresses/${address}/transactions`, params);
  }

  async getAddressTokenTransfers(address: string, limit: number = 50, page?: string) {
    const params: any = { limit };
    if (page) params.page = page;
    
    return this.makeRequest(`/addresses/${address}/token-transfers`, params);
  }

  async getAddressInternalTransactions(address: string, limit: number = 50, page?: string) {
    const params: any = { limit };
    if (page) params.page = page;
    
    return this.makeRequest(`/addresses/${address}/internal-transactions`, params);
  }

  // ========== TOKENS API ==========
  async getTokens(limit: number = 50, page?: string) {
    const params: any = { limit };
    if (page) params.page = page;
    
    try {
      return this.makeRequest("/tokens", params);
    } catch (error) {
      console.warn("Tokens endpoint may not be available or may timeout");
      throw error;
    }
  }

  async getTokenInfo(contractAddress: string) {
    return this.makeRequest(`/tokens/${contractAddress}`);
  }

  async getTokenTransfers(contractAddress: string, limit: number = 50, page?: string) {
    const params: any = { limit };
    if (page) params.page = page;
    
    return this.makeRequest(`/tokens/${contractAddress}/transfers`, params);
  }

  async getTokenHolders(contractAddress: string, limit: number = 50, page?: string) {
    const params: any = { limit };
    if (page) params.page = page;
    
    return this.makeRequest(`/tokens/${contractAddress}/holders`, params);
  }

  // ========== STATS API ==========
  async getNetworkStats() {
    return this.makeRequest("/stats");
  }

  // ========== SEARCH API ==========
  async search(query: string) {
    return this.makeRequest("/search", { q: query });
  }

  // ========== TOAST TOKEN SPECIFIC METHODS ==========
  async getTOASTTokenInfo(contractAddress: string) {
    try {
      const [tokenInfo, addressInfo] = await Promise.all([
        this.getTokenInfo(contractAddress).catch(() => null),
        this.getAddressInfo(contractAddress).catch(() => null),
      ]);

      return {
        contractAddress,
        tokenInfo,
        addressInfo,
        explorerURL: this.getExplorerURL("address", contractAddress),
      };
    } catch (error) {
      console.error("Error fetching TOAST token info:", error);
      throw error;
    }
  }

  async getTOASTTokenTransfers(contractAddress: string, limit: number = 50) {
    try {
      return await this.getTokenTransfers(contractAddress, limit);
    } catch (error) {
      console.error("Error fetching TOAST token transfers:", error);
      throw error;
    }
  }

  async getTOASTTokenHolders(contractAddress: string, limit: number = 100) {
    try {
      return await this.getTokenHolders(contractAddress, limit);
    } catch (error) {
      console.error("Error fetching TOAST token holders:", error);
      throw error;
    }
  }

  async getAccountTOASTBalance(contractAddress: string, address: string) {
    try {
      // Get address info which should include token balances
      const addressInfo = await this.getAddressInfo(address);
      
      // Look for TOAST token in the address's token balances
      if (addressInfo.token_balances) {
        const toastBalance = addressInfo.token_balances.find(
          (token: any) => token.token?.address?.toLowerCase() === contractAddress.toLowerCase()
        );
        
        if (toastBalance) {
          return {
            address,
            balance: ethers.formatEther(toastBalance.value || "0"),
            balanceWei: toastBalance.value || "0",
            token: toastBalance.token,
          };
        }
      }
      
      return {
        address,
        balance: "0",
        balanceWei: "0",
        token: null,
      };
    } catch (error) {
      console.error("Error fetching TOAST balance:", error);
      throw error;
    }
  }

  async getAccountTOASTTransactions(contractAddress: string, address: string, limit: number = 50) {
    try {
      // Get token transfers for the specific address and contract
      const transfers = await this.getAddressTokenTransfers(address, limit);
      
      // Filter for TOAST token transfers
      if (transfers.items) {
        const toastTransfers = transfers.items.filter(
          (transfer: any) => transfer.token?.address?.toLowerCase() === contractAddress.toLowerCase()
        );
        
        return {
          ...transfers,
          items: toastTransfers,
        };
      }
      
      return transfers;
    } catch (error) {
      console.error("Error fetching TOAST transactions:", error);
      throw error;
    }
  }

  // ========== UTILITY METHODS ==========
  getExplorerURL(type: "tx" | "address" | "block" | "token", identifier: string) {
    const baseURL = "https://somnia.w3us.site";
    switch (type) {
      case "tx":
        return `${baseURL}/tx/${identifier}`;
      case "address":
        return `${baseURL}/address/${identifier}`;
      case "block":
        return `${baseURL}/block/${identifier}`;
      case "token":
        return `${baseURL}/token/${identifier}`;
      default:
        return baseURL;
    }
  }

  // Verify contract deployment by checking if address exists and has code
  async verifyContractDeployment(contractAddress: string, txHash: string) {
    try {
      const [addressInfo, txInfo] = await Promise.all([
        this.getAddressInfo(contractAddress),
        this.getTransactionByHash(txHash),
      ]);

      return {
        isDeployed: addressInfo && (addressInfo.is_contract || addressInfo.creator_address_hash),
        contractAddress,
        deploymentTxHash: txHash,
        isVerified: addressInfo?.is_verified || false,
        explorerURL: this.getExplorerURL("address", contractAddress),
        txURL: this.getExplorerURL("tx", txHash),
        addressInfo,
        txInfo,
      };
    } catch (error) {
      console.error("Error verifying contract deployment:", error);
      throw error;
    }
  }

  // Get recent network activity summary
  async getNetworkSummary() {
    try {
      const [stats, recentTxs, recentBlocks] = await Promise.all([
        this.getNetworkStats(),
        this.getTransactions(5),
        this.getBlocks(5),
      ]);

      return {
        stats,
        recentTransactions: recentTxs.items || [],
        recentBlocks: recentBlocks.items || [],
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error getting network summary:", error);
      throw error;
    }
  }
}

// Export a default instance
export const somniaExplorer = new ShannonExplorerAPI();

// Export types for TypeScript
export interface NetworkSummary {
  stats: any;
  recentTransactions: any[];
  recentBlocks: any[];
  timestamp: string;
}

export interface TOASTTokenInfo {
  contractAddress: string;
  tokenInfo: any;
  addressInfo: any;
  explorerURL: string;
}

export interface TOASTBalance {
  address: string;
  balance: string;
  balanceWei: string;
  token: any;
}

export interface DeploymentVerification {
  isDeployed: boolean;
  contractAddress: string;
  deploymentTxHash: string;
  isVerified: boolean;
  explorerURL: string;
  txURL: string;
  addressInfo: any;
  txInfo: any;
}
