import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as {
      id: number;
      email: string;
      role: string;
    };
    
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Недействительный токен' });
  }
}; 