import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../prisma/client';
import { generateToken } from '../utils/jwt';

interface AuthenticatedRequest extends Request {
  user?: { id: number; email: string };
}

interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role?: string; // El ? = opcional
}

interface LoginRequest {
  email: string;
  password: string;
}

interface UpdateProfileRequest {
  name?: string;
  email?: string;
  password?: string;
  currentPassword?: string;
}

interface DeleteProfileRequest {
  password: string;
}

interface UserUpdateData {
  name?: string;
  email?: string;
  password?: string;
}

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role = 'user' }: RegisterRequest = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Verifica si el usuario ya existe en la base de datos
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }
    
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Crea el usuario en la base de datos. data son los datos del usuario que se crean. select es para seleccionar los campos que se van a devolver.
    const user = await prisma.user.create({ data: { name, email, password: hashedPassword, role }, select: { id: true, name: true, email: true, role: true } });

    const token = generateToken({ id: user.id, email: user.email, role: user.role });
    
    res.status(201).json({ message: 'User registered successfully', user, token});
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password }: LoginRequest = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email }
    });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    const token = generateToken({ id: user.id, email: user.email, role: user.role });

    res.status(200).json({ message: 'User logged in successfully', user: { id: user.id, name: user.name, email: user.email, role: user.role }, token });
  } catch (error) {
    console.error('Error logging in user:', error);
    res.status(500).json({ error: 'Failed to login user' });
  }
};

export const getProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, role: true, orders: { select: { id: true, total: true, createdAt: true, items: { select: { id: true, quantity: true, product: { select: { id: true, name: true, price: true } } } } } } } });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({message: 'User profile retrieved successfully', user});
  } catch (error) {
    console.error('Error getting user profile:', error);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { name, email, password, currentPassword }: UpdateProfileRequest = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const currentUser = await prisma.user.findUnique({ where: { id: userId } });

    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Define el tipo de updateData
    const updateData: UserUpdateData = {};

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({ error: 'Name cannot be empty' });
      }
      updateData.name = name;
    }

    if (email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
      // Verifica si el email ya existe en la base de datos, sin incluirse el mismo usuario
      const existingUser = await prisma.user.findFirst({ where: { email, id: { not: userId } } });
      if (existingUser) {
        return res.status(409).json({ error: 'Email is already taken' });
      }
      updateData.email = email;
    }

    if (password !== undefined) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required to change password' });
      }
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, currentUser.password);
      if (!isCurrentPasswordValid) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
      if (password.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters long' });
      }
      const saltRounds = 12;
      updateData.password = await bcrypt.hash(password, saltRounds);
    }

    const updatedUser = await prisma.user.update({ where: { id: userId }, data: updateData, select: { id: true, name: true, email: true, role: true } });

    res.status(200).json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

export const deleteProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { password }: DeleteProfileRequest = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    if (!password) {
      return res.status(400).json({ error: 'Password is required to delete account' });
    }

    const currentUser = await prisma.user.findUnique({ where: { id: userId } });

    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isPasswordValid = await bcrypt.compare(password, currentUser.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    await prisma.user.delete({ where: { id: userId } });

    res.status(200).json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
};