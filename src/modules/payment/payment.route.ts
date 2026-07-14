import { Router } from 'express';
import { PaymentController } from './payment.controller';
import auth from '../../middlewares/auth';

const router = Router();

router.post('/create', auth('CUSTOMER'), PaymentController.createPayment);
router.get('/success', PaymentController.paymentSuccess);
router.get('/cancel', PaymentController.paymentCancel);
router.get('/', auth('CUSTOMER', 'ADMIN'), PaymentController.getPayments);
router.get('/:id', auth('CUSTOMER', 'ADMIN'), PaymentController.getPaymentById);

export const PaymentRoutes = router;