import { chromium, Browser, Page } from 'playwright';
import * as cheerio from 'cheerio';

export class PlaywrightCrawler {
    private browser: Browser | null = null;
    private isInitialized = false;

    async initialize() {
        if (this.isInitialized) return;

        try {
            this.browser = await chromium.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--disable-gpu',
                ]
            });
            this.isInitialized = true;
            console.log('Playwright browser initialized');
        } catch (error) {
            console.error('Failed to initialize Playwright:', error);
            throw error;
        }
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.isInitialized = false;
        }
    }

    async scrapePage(url: string): Promise<string | null> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        let page: Page | null = null;

        try {
            if (!this.browser) throw new Error('Browser not initialized');

            const context = await this.browser.newContext({
                userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                viewport: { width: 1920, height: 1080 },
                deviceScaleFactor: 1,
                isMobile: false,
                hasTouch: false,
                locale: 'en-US',
                timezoneId: 'America/New_York',
                permissions: ['geolocation'],
            });

            page = await context.newPage();

            // Stealth: Add init scripts to mask automation
            await page.addInitScript(() => {
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined,
                });
            });

            console.log(`Navigating to ${url} with Playwright...`);

            // Navigate with timeout and wait for content
            await page.goto(url, {
                waitUntil: 'domcontentloaded',
                timeout: 30000
            });

            // Wait for potential recipe content to load
            try {
                await Promise.race([
                    page.waitForSelector('script[type="application/ld+json"]', { timeout: 5000 }),
                    page.waitForSelector('[itemtype*="Recipe"]', { timeout: 5000 }),
                    page.waitForSelector('.ingredients', { timeout: 5000 }),
                    page.waitForTimeout(2000) // Fallback wait
                ]);
            } catch (e) {
                // Continue even if specific selectors aren't found immediately
                console.log('Timeout waiting for specific selectors, proceeding with available content');
            }

            // Scroll to trigger lazy loading
            await page.evaluate(async () => {
                await new Promise<void>((resolve) => {
                    let totalHeight = 0;
                    const distance = 100;
                    const timer = setInterval(() => {
                        const scrollHeight = document.body.scrollHeight;
                        window.scrollBy(0, distance);
                        totalHeight += distance;

                        if (totalHeight >= scrollHeight || totalHeight > 5000) {
                            clearInterval(timer);
                            resolve();
                        }
                    }, 100);
                });
            });

            // Get the full HTML content
            const content = await page.content();
            return content;

        } catch (error) {
            console.error(`Playwright scraping failed for ${url}:`, error);
            return null;
        } finally {
            if (page) {
                await page.close();
            }
        }
    }
}

export const playwrightCrawler = new PlaywrightCrawler();
