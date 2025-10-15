import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { createOrder } from '../controllers/orderController';  

const router = Router();

router.post('/', authMiddleware, createOrder);

export default router;
