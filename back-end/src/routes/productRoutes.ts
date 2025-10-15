import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { getProducts, createProduct } from '../controllers/productController';

const router = Router();

router.get('/', authMiddleware, getProducts);
router.post('/', authMiddleware, createProduct);

export default router;
