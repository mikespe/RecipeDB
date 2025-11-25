/**
 * Image utility functions - DRY principle
 * Centralized image processing logic
 */

/**
 * Convert File to base64 data URL
 * @param file - Image file to convert
 * @returns Promise resolving to base64 data URL
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onloadend = () => {
      const result = reader.result as string;
      if (result) {
        resolve(result);
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read image file'));
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * Validate image file
 * @param file - File to validate
 * @returns true if valid image file
 */
export function isValidImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

