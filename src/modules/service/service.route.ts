import { Router } from 'express';
import { ServiceController } from './service.controller';
import auth from '../../middlewares/auth';

// Public: GET /api/services, GET /api/services/:id
const router = Router();
router.get('/', ServiceController.getAllServices);
router.get('/:id', ServiceController.getServiceById);
export const ServiceRoutes = router;

// Private (technician-only): mounted at /api/technician/services
const technicianRouter = Router();
technicianRouter.get('/', auth('TECHNICIAN'), ServiceController.getMyServices);
technicianRouter.post('/', auth('TECHNICIAN'), ServiceController.createMyService);
technicianRouter.put('/:id', auth('TECHNICIAN'), ServiceController.updateMyService);
technicianRouter.delete('/:id', auth('TECHNICIAN'), ServiceController.deleteMyService);
export const TechnicianServiceRoutes = technicianRouter;