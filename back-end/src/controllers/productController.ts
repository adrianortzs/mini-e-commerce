import { Request, Response } from 'express';
import prisma from '../prisma/client';

interface AuthenticatedRequest extends Request {
  user?: { id: number; email: string; role?: string };
}

interface CreateProductRequest {
  name: string;
  price: number;
  stock: number;
  image?: string;
}

interface UpdateProductRequest {
  name?: string;
  price?: number;
  stock?: number;
  image?: string;
}

export const getProducts = async (req: Request, res: Response) => {
  try {
    // Obtiene parametros de la URL
    const { page = 1, limit = 10, search, minPrice, maxPrice } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Inicializa where para poder filtrar
    const where: any = {};
    
    if (search) where.name = { contains: search as string, mode: 'insensitive' }; // Filtra por nombre ignorando mayúsculas y minúsculas

    if (minPrice || maxPrice) {
      where.price = {}; // Inicializa el precio para poder usar gte y lte
      if (minPrice) where.price.gte = parseFloat(minPrice as string); // gte mayor o igual
      if (maxPrice) where.price.lte = parseFloat(maxPrice as string); // lte menor o igual
    }

    // Promise.all para ejecutar las consultas en paralelo
    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({ where, skip, take: limitNum, orderBy: { id: 'desc' } }),
      prisma.product.count({ where })
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    res.status(200).json({ message: 'Products retrieved successfully', products, pagination: { currentPage: pageNum, totalPages, totalCount, hasNext: pageNum < totalPages, hasPrev: pageNum > 1 } });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to get products' });
  }
};

export const getProductById = async (req: Request, res: Response) => {
  try {
    const productId = parseInt(req.params.id);

    if (isNaN(productId)) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.status(200).json({ message: 'Product retrieved successfully', product });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to get product' });
  }
};

export const createProduct = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, price, stock, image }: CreateProductRequest = req.body;

    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    if (!name || price === undefined || stock === undefined) {
      return res.status(400).json({ error: 'Name, price, and stock are required' });
    }

    if (price < 0 || stock < 0) {
      return res.status(400).json({ error: 'Price and stock must be non-negative' });
    }

    const product = await prisma.product.create({ data: { name, price, stock, image } });

    res.status(201).json({ message: 'Product created successfully', product });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
};

export const updateProduct = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const productId = parseInt(req.params.id);
    const { name, price, stock, image }: UpdateProductRequest = req.body;

    if (isNaN(productId)) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    const existingProduct = await prisma.product.findUnique({ where: { id: productId } });

    if (!existingProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (price !== undefined && price < 0) {
      return res.status(400).json({ error: 'Price must be non-negative' });
    }

    if (stock !== undefined && stock < 0) {
      return res.status(400).json({ error: 'Stock must be non-negative' });
    }

    const updateData: UpdateProductRequest = {};
    if (name !== undefined) updateData.name = name;
    if (price !== undefined) updateData.price = price;
    if (stock !== undefined) updateData.stock = stock;
    if (image !== undefined) updateData.image = image;

    const product = await prisma.product.update({ where: { id: productId }, data: updateData });

    res.status(200).json({ message: 'Product updated successfully', product });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
};

export const deleteProduct = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const productId = parseInt(req.params.id);

    if (isNaN(productId)) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    const existingProduct = await prisma.product.findUnique({ where: { id: productId } });

    if (!existingProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    await prisma.product.delete({ where: { id: productId } });

    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
};