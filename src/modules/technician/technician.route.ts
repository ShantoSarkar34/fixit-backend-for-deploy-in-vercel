import { Router } from 'express';
import { TechnicianController } from './technician.controller';
import auth from '../../middlewares/auth';

// Public: GET /api/technicians, GET /api/technicians/:id
const router = Router();
router.get('/', TechnicianController.getAllTechnicians);
router.get('/:id', TechnicianController.getTechnicianById);
export const TechnicianRoutes = router;

// Private (technician-only): mounted at /api/technician
const privateRouter = Router();
privateRouter.get('/profile', auth('TECHNICIAN'), TechnicianController.getMyProfile);
privateRouter.put('/profile', auth('TECHNICIAN'), TechnicianController.upsertMyProfile);
privateRouter.get('/availability', auth('TECHNICIAN'), TechnicianController.getMyAvailability);
privateRouter.put('/availability', auth('TECHNICIAN'), TechnicianController.setMyAvailability);
export const TechnicianPrivateRoutes = privateRouter;