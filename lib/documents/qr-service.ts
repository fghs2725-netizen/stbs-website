import QRCode from 'qrcode';
import crypto from 'crypto';

function getSecretKey(): string {
  const value = process.env.QR_SECRET_KEY;
  if (!value) throw new Error('QR_SECRET_KEY is not configured. Set it in your environment variables.');
  return value;
}
const BASE_URL = process.env.NEXT_PUBLIC_VERIFY_URL || 'https://stbs.in/verify/';

export class QRService {
  /**
   * Generates a unique, tamper-resistant verification code for a document
   */
  static generateVerificationCode(documentRef: string): string {
    const timestamp = Date.now().toString(36);
    const data = `${documentRef}:${timestamp}`;
    const hmac = crypto.createHmac('sha256', getSecretKey()).update(data).digest('hex').substring(0, 10);
    return `${documentRef}-${timestamp}-${hmac}`;
  }

  /**
   * Builds the full URL for verification
   */
  static getVerificationUrl(code: string): string {
    return `${BASE_URL}${code}`;
  }

  /**
   * Generates a QR Code as a Data URL (base64)
   */
  static async generateQRDataUrl(verificationUrl: string): Promise<string> {
    try {
      return await QRCode.toDataURL(verificationUrl, {
        errorCorrectionLevel: 'H', // High error correction for robust scanning
        margin: 1,
        color: {
          dark: '#090909',  // STBS ink color
          light: '#ffffff',
        }
      });
    } catch (err) {
      console.error('Failed to generate QR code:', err);
      throw new Error('QR Code generation failed');
    }
  }
}
