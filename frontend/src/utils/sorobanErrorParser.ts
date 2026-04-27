/**
 * Soroban Error Parser - Decodes smart contract and wallet errors into user-friendly messages
 */

export interface ParsedError {
  userMessage: string;
  isRetryable: boolean;
  shouldShowRetry: boolean;
}

export class SorobanErrorParser {
  parse(error: unknown): ParsedError {
    const errorMessage = this.extractErrorMessage(error);
    
    if (this.isFreighterRejection(errorMessage)) {
      return {
        userMessage: 'Transaction cancelled: You rejected the transaction in Freighter wallet.',
        isRetryable: true,
        shouldShowRetry: false
      };
    }
    
    if (this.isNetworkError(errorMessage)) {
      return {
        userMessage: 'Network error: Failed to connect to the blockchain. Please check your internet connection and try again.',
        isRetryable: true,
        shouldShowRetry: true
      };
    }
    
    const contractError = this.parseContractRevert(errorMessage);
    if (contractError) {
      return contractError;
    }
    
    if (this.isInsufficientBalanceError(errorMessage)) {
      return {
        userMessage: 'Transaction failed: Insufficient balance to complete this transaction.',
        isRetryable: false,
        shouldShowRetry: false
      };
    }
    
    if (this.isSimulationError(errorMessage)) {
      return {
        userMessage: `Transaction simulation failed: ${this.cleanErrorMessage(errorMessage)}`,
        isRetryable: true,
        shouldShowRetry: true
      };
    }
    
    return {
      userMessage: `Transaction failed: ${this.cleanErrorMessage(errorMessage)}`,
      isRetryable: false,
      shouldShowRetry: false
    };
  }
  
  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    if (error && typeof error === 'object' && 'message' in error) {
      return String(error.message);
    }
    return 'Unknown error occurred';
  }
  
  private isFreighterRejection(message: string): boolean {
    const rejectionPatterns = [
      /user rejected/i,
      /cancelled by user/i,
      /Freighter.*reject/i,
      /signature.*declined/i,
      /transaction cancelled/i,
      /rejected by user/i
    ];
    return rejectionPatterns.some(pattern => pattern.test(message));
  }
  
  private isNetworkError(message: string): boolean {
    const networkPatterns = [
      /network error/i,
      /connection.*fail/i,
      /ECONNREFUSED/i,
      /ENOTFOUND/i,
      /timeout/i,
      /failed to fetch/i,
      /network request failed/i
    ];
    return networkPatterns.some(pattern => pattern.test(message));
  }
  
  private isInsufficientBalanceError(message: string): boolean {
    const balancePatterns = [
      /insufficient balance/i,
      /not enough balance/i,
      /balance too low/i,
      /insufficient funds/i
    ];
    return balancePatterns.some(pattern => pattern.test(message));
  }
  
  private isSimulationError(message: string): boolean {
    return message.includes('Simulation failed') || message.includes('simulation');
  }
  
  private parseContractRevert(message: string): ParsedError | null {
    const revertPatterns: { pattern: RegExp; userMessage: string; retryable: boolean }[] = [
      {
        pattern: /AlreadyClaimed|already claimed/i,
        userMessage: 'You have already claimed this reward. Each reward can only be claimed once.',
        retryable: false
      },
      {
        pattern: /NotEnoughPoints|insufficient points/i,
        userMessage: 'You don\'t have enough loyalty points for this transaction.',
        retryable: false
      },
      {
        pattern: /Expired|campaign expired/i,
        userMessage: 'This campaign has expired. Please check available rewards.',
        retryable: false
      },
      {
        pattern: /InvalidAmount|invalid amount/i,
        userMessage: 'Invalid transaction amount. Please check the value and try again.',
        retryable: true
      },
      {
        pattern: /CampaignNotFound|not found/i,
        userMessage: 'Campaign not found. The reward may no longer be available.',
        retryable: false
      },
      {
        pattern: /RedeemFailed|redemption failed/i,
        userMessage: 'Reward redemption failed. Please try again later.',
        retryable: true
      }
    ];
    
    for (const { pattern, userMessage, retryable } of revertPatterns) {
      if (pattern.test(message)) {
        return {
          userMessage,
          isRetryable: retryable,
          shouldShowRetry: retryable
        };
      }
    }
    
    return null;
  }
  
  private cleanErrorMessage(message: string): string {
    return message
      .replace(/Error: /i, '')
      .replace(/RpcError: /i, '')
      .replace(/ContractError: /i, '')
      .substring(0, 200);
  }
}
