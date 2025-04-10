import { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { loginSchema } from '../../shared/schema';
import { storage } from '../../server/storage'; // Or move shared logic to its own utils dir
import { ZodError } from 'zod';

const JWT_SECRET = process.env.SESSION_SECRET || 'humanlike-awarebot-secret-key';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const parsed = loginSchema.parse(req.body);
    const user = await storage.getUserByUsername(parsed.username);

    if (!user || !(await bcrypt.compare(parsed.password, user.password))) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });

    res.status(200).json({ token, user: { id: user.id, username: user.username } });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
}
