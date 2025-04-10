import { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { insertUserSchema } from '../../shared/schema';
import { storage } from '../../server/storage';
import { ZodError } from 'zod';

const JWT_SECRET = process.env.SESSION_SECRET || 'humanlike-awarebot-secret-key';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const parsed = insertUserSchema.parse(req.body);

    const existingUser = await storage.getUserByUsername(parsed.username);
    if (existingUser) {
      return res.status(409).json({ message: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(parsed.password, 10);

    const createdUser = await storage.createUser({
      ...parsed,
      password: hashedPassword,
    });

    const token = jwt.sign({ userId: createdUser.id }, JWT_SECRET, { expiresIn: '1h' });

    res.status(201).json({ token, user: { id: createdUser.id, username: createdUser.username } });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
}
