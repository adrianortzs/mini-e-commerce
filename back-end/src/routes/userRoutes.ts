import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { register, login, profile } from '../controllers/userController';

const router = Router();

router.post('/register', authMiddleware, register);
router.get('/login', authMiddleware, login);
router.get('/profile', authMiddleware, profile);

export default router;