import { Router } from 'express';
import { AuthController } from './auth.controller';
import auth from '../../middlewares/auth';
 
const router = Router();
 
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/refresh-token', AuthController.refreshToken);
router.post('/logout', AuthController.logout);
router.get('/me', auth(), AuthController.getMe);
 
export const AuthRoutes = router;