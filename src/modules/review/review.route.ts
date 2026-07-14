import { Router } from 'express';
import { ReviewController } from './review.controller';
import auth from '../../middlewares/auth';

const router = Router();

router.post('/', auth('CUSTOMER'), ReviewController.createReview);
router.get('/', ReviewController.getReviews);
router.get('/:id', ReviewController.getReviewById);

export const ReviewRoutes = router;