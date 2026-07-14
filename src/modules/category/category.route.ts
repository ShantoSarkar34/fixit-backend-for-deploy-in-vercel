import { Router } from 'express';
import { CategoryController } from './category.controller';
import auth from '../../middlewares/auth';

// Public: GET /api/categories
const router = Router();
router.get('/', CategoryController.getAllCategories);
export const CategoryRoutes = router;

// Admin: GET/POST /api/admin/categories
const adminRouter = Router();
adminRouter.get('/', auth('ADMIN'), CategoryController.getAllCategories);
adminRouter.post('/', auth('ADMIN'), CategoryController.createCategory);
export const CategoryAdminRoutes = adminRouter;