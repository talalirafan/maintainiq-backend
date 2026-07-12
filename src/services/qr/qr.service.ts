import QRCode from 'qrcode';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/AppError.js';

export interface QRGenerationOptions {
  assetId: string;
  assetCode: string;
  size?: number; // width/height in pixels
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  margin?: number;
}

export interface QRData {
  url: string;
  assetCode: string;
  assetId: string;
}

/**
 * QR Code Service
 * Handles generation, validation, and serialization of QR codes.
 * QR codes are never embedded with sensitive internal data.
 */
export class QRService {
  /**
   * Generate QR code data URL for asset
   * QR contains ONLY the public URL
   */
  async generateDataUrl(options: QRGenerationOptions): Promise<string> {
    try {
      const publicUrl = this.buildPublicAssetUrl(options.assetId);

      const dataUrl = await QRCode.toDataURL(publicUrl, {
        width: options.size || 300,
        margin: options.margin || 2,
        errorCorrectionLevel: options.errorCorrectionLevel || 'M',
        type: 'image/png',
      });

      return dataUrl;
    } catch (error) {
      throw new AppError(
        'Failed to generate QR code',
        500,
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }

  /**
   * Generate QR code as PNG buffer
   */
  async generateBuffer(
    options: QRGenerationOptions,
  ): Promise<Buffer> {
    try {
      const publicUrl = this.buildPublicAssetUrl(options.assetId);

      const buffer = await QRCode.toBuffer(publicUrl, {
        width: options.size || 300,
        margin: options.margin || 2,
        errorCorrectionLevel: options.errorCorrectionLevel || 'M',
        type: 'png',
      });

      return buffer;
    } catch (error) {
      throw new AppError(
        'Failed to generate QR code',
        500,
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }

  /**
   * Generate QR code as SVG string
   */
  async generateSVG(options: QRGenerationOptions): Promise<string> {
    try {
      const publicUrl = this.buildPublicAssetUrl(options.assetId);

      const svg = await QRCode.toString(publicUrl, {
        width: options.size || 300,
        margin: options.margin || 2,
        errorCorrectionLevel: options.errorCorrectionLevel || 'M',
        type: 'svg',
      });

      return svg;
    } catch (error) {
      throw new AppError(
        'Failed to generate QR code',
        500,
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }

  /**
   * Extract QR metadata (never contains sensitive data)
   */
  getQRMetadata(options: QRGenerationOptions): QRData {
    return {
      url: this.buildPublicAssetUrl(options.assetId),
      assetCode: options.assetCode,
      assetId: options.assetId,
    };
  }

  /**
   * Build public asset URL for QR code
   * This is the ONLY data embedded in QR codes
   */
  private buildPublicAssetUrl(assetId: string): string {
    const baseUrl = env.publicAppUrl.replace(/\/$/, '');
    return `${baseUrl}/public/assets/${assetId}`;
  }

  /**
   * Validate if a QR code URL is valid for this system
   */
  validateQRUrl(url: string): boolean {
    const expectedPattern = `${env.publicAppUrl.replace(/\/$/, '')}/public/assets/`;
    return url.startsWith(expectedPattern);
  }

  /**
   * Extract asset ID from QR URL
   */
  extractAssetIdFromUrl(url: string): string | null {
    try {
      const expectedPattern = `${env.publicAppUrl.replace(/\/$/, '')}/public/assets/`;
      if (!url.startsWith(expectedPattern)) {
        return null;
      }
      const assetId = url.replace(expectedPattern, '').split(/[?#]/)[0];
      return assetId || null;
    } catch {
      return null;
    }
  }
}

export const qrService = new QRService();
