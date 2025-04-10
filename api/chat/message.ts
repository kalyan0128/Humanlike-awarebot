import { VercelRequest, VercelResponse } from '@vercel/node';
import { chatMessageSchema } from '../../shared/schema';
import { storage } from '../../server/storage';
import { ZodError } from 'zod';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const parsed = chatMessageSchema.parse(req.body);

    const result = await storage.saveChatMessage(parsed.userId, parsed.message);

    res.status(200).json({ success: true, messageId: result.id });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }

    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
