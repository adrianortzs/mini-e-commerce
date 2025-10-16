import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { createOrder, getUserOrders, getOrderById } from '../controllers/orderController';  

const router = Router();

router.post('/', authMiddleware, createOrder);
router.get('/', authMiddleware, getUserOrders);
router.get('/:id', authMiddleware, getOrderById);

export default router;