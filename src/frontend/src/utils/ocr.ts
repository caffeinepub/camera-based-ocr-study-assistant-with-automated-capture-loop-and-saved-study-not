/**
 * Client-side OCR utility
 * 
 * NOTE: This is a mock implementation for development purposes.
 * To enable real OCR functionality, tesseract.js needs to be installed:
 * 
 * 1. Add to package.json dependencies: "tesseract.js": "^5.1.1"
 * 2. Run: pnpm install
 * 3. Replace this mock implementation with the real one below
 * 
 * Real implementation (uncomment when tesseract.js is installed):
 * 
 * import { createWorker, type Worker } from 'tesseract.js';
 * 
 * let worker: Worker | null = null;
 * 
 * async function getWorker(): Promise<Worker> {
 *   if (!worker) {
 *     worker = await createWorker('eng', 1, {
 *       logger: () => {}, // Suppress logs
 *     });
 *   }
 *   return worker;
 * }
 * 
 * export async function extractTextFromImage(
 *   imageSource: HTMLCanvasElement | HTMLImageElement | string
 * ): Promise<string> {
 *   try {
 *     const tesseractWorker = await getWorker();
 *     const { data } = await tesseractWorker.recognize(imageSource);
 *     return data.text || '';
 *   } catch (error) {
 *     console.error('OCR extraction error:', error);
 *     throw new Error('Failed to extract text from image');
 *   }
 * }
 * 
 * export async function terminateWorker(): Promise<void> {
 *   if (worker) {
 *     await worker.terminate();
 *     worker = null;
 *   }
 * }
 */

// Mock implementation - simulates OCR processing
export async function extractTextFromImage(
  imageSource: HTMLCanvasElement | HTMLImageElement | string
): Promise<string> {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Return mock text to demonstrate the flow
  // In production, this would be replaced with actual Tesseract.js OCR
  const mockTexts = [
    'This is sample extracted text from the image.\nLine 2 of the sample text.\nLine 3 with more content.',
    'Another sample text block.\nThis demonstrates the OCR functionality.\nMultiple lines are supported.',
    'Study material example:\n1. First point to remember\n2. Second important concept\n3. Third key idea',
    'Question: What is the capital of France?\nA) London\nB) Paris\nC) Berlin\nD) Madrid',
  ];
  
  // Return a random mock text to simulate different captures
  const randomIndex = Math.floor(Math.random() * mockTexts.length);
  return mockTexts[randomIndex];
}

export async function terminateWorker(): Promise<void> {
  // Mock implementation - no cleanup needed
  return Promise.resolve();
}
