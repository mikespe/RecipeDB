/**
 * HTML Sanitization utility for recipe scrapers
 * Removes all HTML tags and entities from text content
 */

export class HtmlSanitizer {
  /**
   * Strip all HTML tags from a string
   * Handles nested tags, attributes, and converts HTML entities
   */
  static stripHtml(text: string): string {
    if (!text || typeof text !== 'string') return '';

    let cleaned = text;

    // Remove script and style tags and their content
    cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

    // Remove all HTML tags
    cleaned = cleaned.replace(/<[^>]+>/g, '');

    // Convert common HTML entities
    cleaned = this.decodeHtmlEntities(cleaned);

    // Clean up excessive whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    return cleaned;
  }

  /**
   * Strip HTML from an array of strings
   */
  static stripHtmlFromArray(arr: string[]): string[] {
    if (!Array.isArray(arr)) return [];
    return arr.map(item => this.stripHtml(item)).filter(Boolean);
  }

  /**
   * Decode common HTML entities
   */
  private static decodeHtmlEntities(text: string): string {
    const entities: Record<string, string> = {
      '&nbsp;': ' ',
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&apos;': "'",
      '&cent;': '¢',
      '&pound;': '£',
      '&yen;': '¥',
      '&euro;': '€',
      '&copy;': '©',
      '&reg;': '®',
      '&deg;': '°',
      '&frac14;': '¼',
      '&frac12;': '½',
      '&frac34;': '¾',
      '&times;': '×',
      '&divide;': '÷',
    };

    let decoded = text;

    // Replace named entities
    for (const [entity, char] of Object.entries(entities)) {
      decoded = decoded.split(entity).join(char);
    }

    // Replace numeric entities (&#123; or &#x7B;)
    decoded = decoded.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec)));
    decoded = decoded.replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

    return decoded;
  }

  /**
   * Remove only image tags but keep other content
   * Useful for preserving formatting while removing images
   */
  static removeImageTags(text: string): string {
    if (!text || typeof text !== 'string') return '';
    return text.replace(/<img[^>]*>/gi, '');
  }

  /**
   * Extract alt text from img tags before removing them
   * Useful for preserving image descriptions
   */
  static extractImageDescriptions(text: string): string[] {
    if (!text || typeof text !== 'string') return [];

    const descriptions: string[] = [];
    const imgTagRegex = /<img[^>]+alt=["']([^"']+)["'][^>]*>/gi;
    let match;

    while ((match = imgTagRegex.exec(text)) !== null) {
      if (match[1] && match[1].trim()) {
        descriptions.push(match[1].trim());
      }
    }

    return descriptions;
  }
}
