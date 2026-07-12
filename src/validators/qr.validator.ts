import { z } from 'zod';

export const generateQRSchema = z.object({
  assetId: z.string().min(1, 'Asset ID is required').refine((val) => {
    try {
      // Validate if it's a valid MongoDB ObjectId or UUID
      return /^[0-9a-f]{24}$|^[0-9a-f-]{36}$/i.test(val);
    } catch {
      return false;
    }
  }, 'Invalid asset ID format'),
});

export const qrPreviewSchema = z.object({
  size: z.coerce.number().min(100, 'Size must be at least 100px').max(2000, 'Size must not exceed 2000px').optional().default(300),
  errorCorrectionLevel: z.enum(['L', 'M', 'Q', 'H']).optional().default('M'),
  margin: z.coerce.number().min(0, 'Margin must be >= 0').max(10, 'Margin must be <= 10').optional().default(2),
  format: z.enum(['png', 'svg', 'dataurl']).optional().default('dataurl'),
});

export const qrDownloadSchema = z.object({
  format: z.enum(['png', 'svg']).optional().default('png'),
  size: z.coerce.number().min(100, 'Size must be at least 100px').max(2000, 'Size must not exceed 2000px').optional().default(300),
});

export type GenerateQRInput = z.infer<typeof generateQRSchema>;
export type QRPreviewInput = z.infer<typeof qrPreviewSchema>;
export type QRDownloadInput = z.infer<typeof qrDownloadSchema>;
