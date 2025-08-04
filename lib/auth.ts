import { GoogleAuth, OAuth2Client } from 'google-auth-library';

export class AuthenticationError extends Error {
  constructor(
    message: string,
    public code?: string,
    public description?: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthManager {
  private static instance: AuthManager;
  private auth: GoogleAuth;
  private client: OAuth2Client | null = null;
  private cachedToken: string | null = null;
  private tokenExpiry: number | null = null;
  private readonly TOKEN_BUFFER_TIME = 5 * 60 * 1000; // 5 minutes buffer before expiry
  
  private constructor() {
    this.auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
  }
  
  public static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }
  
  private isTokenValid(): boolean {
    if (!this.cachedToken || !this.tokenExpiry) {
      return false;
    }
    return Date.now() < (this.tokenExpiry - this.TOKEN_BUFFER_TIME);
  }
  
  private async refreshAuth(): Promise<void> {
    try {
      console.log('Refreshing authentication...');
      this.client = null;
      this.cachedToken = null;
      this.tokenExpiry = null;
      
      // Force refresh by creating new auth instance
      this.auth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      });
      
      this.client = await this.auth.getClient() as OAuth2Client;
    } catch (error: any) {
      throw new AuthenticationError(
        'Failed to refresh authentication',
        error.code,
        error.message,
        false
      );
    }
  }
  
  public async getAccessToken(forceRefresh: boolean = false): Promise<string> {
    const maxRetries = 3;
    let lastError: any;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Check if we have a valid cached token
        if (!forceRefresh && this.isTokenValid() && this.cachedToken) {
          console.log('Using cached access token');
          return this.cachedToken;
        }
        
        // Get or refresh client
        if (!this.client || forceRefresh) {
          await this.refreshAuth();
        }
        
        if (!this.client) {
          throw new AuthenticationError('Failed to initialize auth client', undefined, undefined, true);
        }
        
        // Get new access token
        console.log('Fetching new access token...');
        const tokenResponse = await this.client.getAccessToken();
        
        if (!tokenResponse.token) {
          throw new AuthenticationError('No access token received', undefined, undefined, true);
        }
        
        // Cache the token
        this.cachedToken = tokenResponse.token;
        
        // Parse JWT to get expiry (if available)
        try {
          const payload = JSON.parse(
            Buffer.from(tokenResponse.token.split('.')[1], 'base64').toString()
          );
          this.tokenExpiry = payload.exp ? payload.exp * 1000 : Date.now() + 3600 * 1000;
        } catch {
          // Default to 1 hour if we can't parse the token
          this.tokenExpiry = Date.now() + 3600 * 1000;
        }
        
        console.log('Successfully obtained access token');
        return tokenResponse.token;
        
      } catch (error: any) {
        lastError = error;
        
        // Check if this is an invalid_grant error
        if (error.message?.includes('invalid_grant') || 
            error.response?.data?.error === 'invalid_grant' ||
            error.code === 'invalid_grant') {
          
          console.error('Authentication failed with invalid_grant error:', error.message);
          
          // Force refresh on next attempt
          forceRefresh = true;
          
          // If this is a RAPT error, we need user intervention
          if (error.message?.includes('invalid_rapt') || 
              error.response?.data?.error_subtype === 'invalid_rapt') {
            throw new AuthenticationError(
              'Authentication requires user intervention. Please run: gcloud auth application-default login',
              'invalid_rapt',
              'Reauth required - Google security check triggered',
              false
            );
          }
        }
        
        // Retry with exponential backoff for other errors
        if (attempt < maxRetries - 1) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          console.warn(`Auth attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // All retries failed
    throw new AuthenticationError(
      `Failed to obtain access token after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`,
      lastError?.code,
      lastError?.message,
      false
    );
  }
  
  // Clear cached credentials
  public clearCache(): void {
    this.cachedToken = null;
    this.tokenExpiry = null;
    this.client = null;
  }
}

// Export a singleton instance getter
export function getAuthManager(): AuthManager {
  return AuthManager.getInstance();
}