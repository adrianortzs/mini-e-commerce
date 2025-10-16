import { Request, Response } from 'express';
import prisma from '../prisma/client';

interface AuthenticatedRequest extends Request {
  user?: { id: number; email: string };
}

interface OrderItem {
  productId: number;
  quantity: number;
}

interface CreateOrderRequest {
  items: OrderItem[];
}

export const createOrder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { items }: CreateOrderRequest = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order items are required' });
    }

    const productIds = items.map(item => item.productId);
    const products = await prisma.product.findMany({ where: { id: { in: productIds } } });

    if (products.length !== productIds.length) {
      return res.status(400).json({ error: 'Some products do not exist' });
    }

    let total = 0;
    for (const item of items) {
      const product = products.find(p => p.id === item.productId);
      if (!product) {
        return res.status(400).json({ error: `Product with ID ${item.productId} not found` });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({ error: `Insufficient stock for product ${product.name}` });
      }
      total += product.price * item.quantity;
    }

    // Crear el pedido con transacción (si algo falla se revierte) para asegurar la consistencia de los datos
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({ data: { userId, total, items: { create: items.map(item => ({ productId: item.productId, quantity: item.quantity })) } },
      include: { items: { include: { product: true } }, user: { select: { id: true, name: true, email: true } } } });

      for (const item of items) {
        await tx.product.update({ where: { id: item.productId }, data: { stock: { decrement: item.quantity } } });
      }

      return newOrder;
    });

    res.status(201).json({ message: 'Order created successfully', order });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
};

export const getUserOrders = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const orders = await prisma.order.findMany({ where: { userId }, include: { items: { include: { product: true } } }, orderBy: { createdAt: 'desc' } });

    res.status(200).json({ message: 'Orders retrieved successfully', orders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

export const getOrderById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const orderId = parseInt(req.params.id);

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    if (isNaN(orderId)) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    // where: userId asegura que el usuario solo pueda acceder a sus propios pedidos
    const order = await prisma.order.findFirst({ where: { id: orderId, userId }, include: { items: { include: { product: true } }, user: { select: { id: true, name: true, email: true } } } });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.status(200).json({ message: 'Order retrieved successfully', order });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
};