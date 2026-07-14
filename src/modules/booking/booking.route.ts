import { Router } from 'express';
import { BookingController } from './booking.controller';
import auth from '../../middlewares/auth';

// Mounted at /api/bookings
const router = Router();
router.post('/', auth('CUSTOMER'), BookingController.createBooking);
router.get('/', auth('CUSTOMER', 'TECHNICIAN', 'ADMIN'), BookingController.getBookings);
router.get('/:id', auth('CUSTOMER', 'TECHNICIAN', 'ADMIN'), BookingController.getBookingById);
router.patch('/:id/cancel', auth('CUSTOMER'), BookingController.cancelBooking);
export const BookingRoutes = router;

// Mounted at /api/technician/bookings
const technicianRouter = Router();
technicianRouter.patch('/:id', auth('TECHNICIAN'), BookingController.updateBookingStatus);
export const TechnicianBookingRoutes = technicianRouter;