/**
 * Scraping Strategies - Centralized HTTP request configurations
 * Consolidates duplicate strategy methods into reusable configurations
 */
import axios, { AxiosRequestConfig } from "axios";

export interface ScrapingStrategyConfig {
  name: string;
  headers: Record<string, string>;
  timeout?: number;
  maxRedirects?: number;
  delayMs?: { min: number; max: number };
}

// Shared utilities
export class ScrapingUtils {
  private static readonly USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0'
  ];

  private static readonly REFERERS = [
    'https://www.google.com/search?q=recipe',
    'https://www.bing.com/search?q=best+recipe',
    'https://duckduckgo.com/?q=homemade+recipe',
    'https://www.pinterest.com/search/pins/?q=recipe',
    'https://www.facebook.com/',
    'https://www.reddit.com/r/Cooking/',
  ];

  static getRandomUserAgent(): string {
    return this.USER_AGENTS[Math.floor(Math.random() * this.USER_AGENTS.length)];
  }

  static getRandomReferer(): string {
    return this.REFERERS[Math.floor(Math.random() * this.REFERERS.length)];
  }

  static getRandomDelay(min = 1000, max = 3000): number {
    return Math.random() * (max - min) + min;
  }

  static generateRandomIP(): string {
    return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
  }

  static generateCloudflareRay(): string {
    const chars = '0123456789abcdef';
    let ray = '';
    for (let i = 0; i < 16; i++) {
      ray += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${ray}-ORD`;
  }

  static generateRealisticCookies(): string {
    const sessionId = Math.random().toString(36).substring(2, 15);
    const userId = Math.random().toString(36).substring(2, 10);

    return [
      `session_id=${sessionId}`,
      `user_id=${userId}`,
      `_ga=GA1.2.${Math.floor(Math.random() * 1000000000)}.${Math.floor(Date.now() / 1000)}`,
      `_gid=GA1.2.${Math.floor(Math.random() * 1000000000)}.${Math.floor(Date.now() / 1000)}`,
      `visited=${Date.now()}`,
      `preferences=theme=light;lang=en`,
      `csrf_token=${Math.random().toString(36).substring(2, 25)}`,
    ].join('; ');
  }
}

// Strategy Definitions
export const SCRAPING_STRATEGIES: ScrapingStrategyConfig[] = [
  {
    name: 'standard',
    timeout: 20000,
    maxRedirects: 15,
    delayMs: { min: 1000, max: 3000 },
    headers: {
      'User-Agent': ScrapingUtils.getRandomUserAgent(),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'max-age=0',
      'Sec-Ch-Ua': '"Google Chrome";v="121", "Chromium";v="121", "Not_A Brand";v="24"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      'Connection': 'keep-alive',
    }
  },
  {
    name: 'mobile',
    timeout: 20000,
    maxRedirects: 10,
    delayMs: { min: 1000, max: 3000 },
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    }
  },
  {
    name: 'simple',
    timeout: 20000,
    maxRedirects: 5,
    delayMs: { min: 1000, max: 3000 },
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html',
      'Accept-Language': 'en-US',
      'Connection': 'keep-alive',
    }
  },
  {
    name: 'firefox',
    timeout: 20000,
    maxRedirects: 10,
    delayMs: { min: 1000, max: 3000 },
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'Referer': 'https://www.google.com/',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'cross-site',
      'Sec-Fetch-User': '?1',
    }
  },
  {
    name: 'safari',
    timeout: 20000,
    maxRedirects: 8,
    delayMs: { min: 1000, max: 3000 },
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Referer': 'https://www.pinterest.com/',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    }
  },
  {
    name: 'googlebot',
    timeout: 15000,
    maxRedirects: 5,
    delayMs: { min: 1000, max: 2000 },
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en',
      'Accept-Encoding': 'gzip, deflate',
      'Connection': 'keep-alive',
    }
  },
  {
    name: 'bingbot',
    timeout: 15000,
    maxRedirects: 3,
    delayMs: { min: 2000, max: 3000 },
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
      'Accept': '*/*',
      'Accept-Encoding': 'gzip, deflate',
      'Connection': 'keep-alive',
      'From': 'bingbot(at)microsoft.com',
    }
  },
  {
    name: 'curl',
    timeout: 10000,
    maxRedirects: 0,
    delayMs: { min: 500, max: 1000 },
    headers: {
      'User-Agent': 'curl/7.68.0',
    }
  },
];

// Advanced strategies for blocked sites
export const ADVANCED_STRATEGIES: ScrapingStrategyConfig[] = [
  {
    name: 'browser-emulation',
    timeout: 30000,
    maxRedirects: 15,
    delayMs: { min: 2000, max: 5000 },
    headers: {
      'User-Agent': ScrapingUtils.getRandomUserAgent(),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br, zstd',
      'Referer': 'https://www.google.com/search?q=recipe',
      'Connection': 'keep-alive',
      'Cache-Control': 'max-age=0',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'cross-site',
      'Sec-Fetch-User': '?1',
      'Sec-Ch-Ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'DNT': '1',
    }
  },
  {
    name: 'residential-proxy',
    timeout: 20000,
    maxRedirects: 8,
    delayMs: { min: 4000, max: 7000 },
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.7,es;q=0.3',
      'Accept-Encoding': 'gzip, deflate, br',
      'Referer': 'https://www.bing.com/',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'cross-site',
    }
  },
];

/**
 * Strategy Executor - Runs a scraping strategy configuration
 */
export class StrategyExecutor {
  /**
   * Execute a single strategy
   */
  static async execute(url: string, strategy: ScrapingStrategyConfig): Promise<any> {
    const delay = strategy.delayMs
      ? ScrapingUtils.getRandomDelay(strategy.delayMs.min, strategy.delayMs.max)
      : ScrapingUtils.getRandomDelay();

    await new Promise(resolve => setTimeout(resolve, delay));

    // Clone headers and add dynamic values
    const headers = { ...strategy.headers };

    // Refresh dynamic headers
    if (headers['User-Agent']?.includes('Chrome') || headers['User-Agent']?.includes('Firefox')) {
      headers['User-Agent'] = ScrapingUtils.getRandomUserAgent();
    }

    const config: AxiosRequestConfig = {
      timeout: strategy.timeout || 20000,
      headers,
      maxRedirects: strategy.maxRedirects || 10,
      validateStatus: (status) => status < 500,
    };

    return axios.get(url, config);
  }

  /**
   * Execute strategies in sequence until one succeeds
   */
  static async executeSequential(
    url: string,
    strategies: ScrapingStrategyConfig[],
    processResponse: (response: any, url: string) => any
  ): Promise<any> {
    for (let i = 0; i < strategies.length; i++) {
      const strategy = strategies[i];
      try {
        console.log(`Attempting strategy: ${strategy.name} (${i + 1}/${strategies.length})`);
        const response = await this.execute(url, strategy);
        const result = processResponse(response, url);
        if (result) {
          console.log(`Success with strategy: ${strategy.name}`);
          return result;
        }
      } catch (error) {
        console.log(`Strategy ${strategy.name} failed:`, error instanceof Error ? error.message : 'Unknown error');

        // If it's a definitive error (like 404), don't try other strategies
        if (error instanceof Error && error.message.includes('not found')) {
          throw error;
        }
        continue;
      }
    }
    return null;
  }

  /**
   * Create ultimate bypass headers with all stealth features
   */
  static getUltimateBypassHeaders(url: string): Record<string, string> {
    return {
      'User-Agent': ScrapingUtils.getRandomUserAgent(),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
      'Accept-Language': 'en-US,en;q=0.9,es;q=0.8,fr;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br, zstd',
      'Referer': ScrapingUtils.getRandomReferer(),
      'Origin': new URL(url).origin,
      'Connection': 'keep-alive',
      'Cache-Control': 'max-age=0',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-User': '?1',
      'Sec-Ch-Ua': '"Google Chrome";v="121", "Not:A-Brand";v="99", "Chromium";v="121"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'DNT': '1',
      'Cookie': ScrapingUtils.generateRealisticCookies(),
      'X-Forwarded-For': ScrapingUtils.generateRandomIP(),
      'X-Real-IP': ScrapingUtils.generateRandomIP(),
      'X-Originating-IP': ScrapingUtils.generateRandomIP(),
      'CF-IPCountry': 'US',
      'CF-RAY': ScrapingUtils.generateCloudflareRay(),
      'CF-Visitor': '{"scheme":"https"}',
    };
  }
}
