import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { register, login, getProfile, updateProfile, deleteProfile } from '../controllers/userController';

const router = Router();

router.post('/register', register);
router.post('/login', login);

router.get('/profile', authMiddleware, getProfile);
router.put('/profile', authMiddleware, updateProfile);
router.delete('/profile', authMiddleware, deleteProfile);

export default router;