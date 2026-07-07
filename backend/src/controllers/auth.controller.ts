import { Response } from 'express';
import prisma from '../config/database';
import { hashPassword, verifyPassword } from '../utils/password';
import { generateAccessToken } from '../utils/jwt';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export async function signup(req: AuthenticatedRequest, res: Response) {
  try {
    const { email, password, name, storeName } = req.body;

    // Simple fields check
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const hashedPassword = await hashPassword(password);

    // Create user and automatically link default marketplaces
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || null,
        storeName: storeName || null,
        marketplaces: {
          create: [
            { marketplace: 'AMAZON', isActive: false },
            { marketplace: 'FLIPKART', isActive: false },
            { marketplace: 'MEESHO', isActive: false },
          ],
        },
      },
    });

    const token = generateAccessToken(user.id);

    return res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        storeName: user.storeName,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error occurred during signup' });
  }
}

export async function login(req: AuthenticatedRequest, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const isPasswordValid = await verifyPassword(password, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const token = generateAccessToken(user.id);

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        storeName: user.storeName,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error occurred during login' });
  }
}

export async function me(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        name: true,
        storeName: true,
        logoUrl: true,
        marketplaces: {
          select: {
            marketplace: true,
            isActive: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json(user);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error fetching user profile' });
  }
}

export async function updateProfile(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, storeName, emailReports } = req.body;

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: {
        name: name !== undefined ? name : undefined,
        storeName: storeName !== undefined ? storeName : undefined,
        emailReports: emailReports !== undefined ? emailReports : undefined,
      },
    });

    return res.status(200).json({
      id: user.id,
      email: user.email,
      name: user.name,
      storeName: user.storeName,
      emailReports: user.emailReports,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error updating user profile' });
  }
}
