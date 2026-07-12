import type { Response } from 'express';
import { assetRepository } from '../../repositories/asset.repository.js';
import { qrService } from '../../services/qr/qr.service.js';
import type { AuthenticatedRequest } from '../../types/api.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { AppError } from '../../utils/AppError.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import type { QRDownloadInput, QRPreviewInput } from '../../validators/qr.validator.js';

function paramId(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return String(value[0] ?? '');
  return String(value ?? '');
}

export class QRController {
  /**
   * Preview QR code (returns data URL or SVG)
   */
  preview = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const assetId = paramId(req.params.id);
    const { size, errorCorrectionLevel, margin, format } = req.query as unknown as QRPreviewInput;

    // Verify asset exists
    const asset = await assetRepository.findById(assetId);
    if (!asset) {
      throw new AppError('Asset not found', 404);
    }

    let qrData: string;
    if (format === 'svg') {
      qrData = await qrService.generateSVG({
        assetId,
        assetCode: asset.assetCode,
        size,
        errorCorrectionLevel,
        margin,
      });
    } else {
      // Default to dataurl (PNG)
      qrData = await qrService.generateDataUrl({
        assetId,
        assetCode: asset.assetCode,
        size,
        errorCorrectionLevel,
        margin,
      });
    }

    sendSuccess(res, { qrCode: qrData, format }, 200, 'QR code generated');
  });

  /**
   * Download QR code as PNG or SVG file
   */
  download = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const assetId = paramId(req.params.id);
    const { format = 'png', size = 300 } = req.query as unknown as QRDownloadInput;

    // Verify asset exists
    const asset = await assetRepository.findById(assetId);
    if (!asset) {
      throw new AppError('Asset not found', 404);
    }

    const filename = `${asset.assetCode}-qr.${format === 'svg' ? 'svg' : 'png'}`;

    if (format === 'svg') {
      const svg = await qrService.generateSVG({
        assetId,
        assetCode: asset.assetCode,
        size,
      });

      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(svg);
    } else {
      const buffer = await qrService.generateBuffer({
        assetId,
        assetCode: asset.assetCode,
        size,
      });

      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);
      res.send(buffer);
    }
  });

  /**
   * Get QR metadata (asset code and public URL)
   */
  metadata = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const assetId = paramId(req.params.id);

    // Verify asset exists
    const asset = await assetRepository.findById(assetId);
    if (!asset) {
      throw new AppError('Asset not found', 404);
    }

    const metadata = qrService.getQRMetadata({
      assetId,
      assetCode: asset.assetCode,
    });

    sendSuccess(res, metadata, 200, 'QR metadata retrieved');
  });

  /**
   * Generate complete QR package (dataURL + metadata)
   */
  generate = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const assetId = paramId(req.params.id);
    const { size = 300, errorCorrectionLevel = 'M', margin = 2 } = req.body || {};

    // Verify asset exists
    const asset = await assetRepository.findById(assetId);
    if (!asset) {
      throw new AppError('Asset not found', 404);
    }

    const qrDataUrl = await qrService.generateDataUrl({
      assetId,
      assetCode: asset.assetCode,
      size,
      errorCorrectionLevel,
      margin,
    });

    const metadata = qrService.getQRMetadata({
      assetId,
      assetCode: asset.assetCode,
    });

    sendSuccess(
      res,
      {
        qrCode: qrDataUrl,
        metadata,
        assetDetails: {
          id: String(asset._id),
          assetCode: asset.assetCode,
          name: asset.name,
          category: asset.category,
        },
      },
      200,
      'QR code generated successfully',
    );
  });
}

export const qrController = new QRController();
