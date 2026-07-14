import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import httpStatus from 'http-status';
import globalErrorHandler from './middlewares/globalErrorHandler';
import notFound from './middlewares/notFound';
import { AuthRoutes } from './modules/auth/auth.route';
import { TechnicianPrivateRoutes, TechnicianRoutes } from './modules/technician/technician.route';
import { CategoryAdminRoutes, CategoryRoutes } from './modules/category/category.route';
import { ServiceRoutes, TechnicianServiceRoutes } from './modules/service/service.route';
import { BookingRoutes, TechnicianBookingRoutes } from './modules/booking/booking.route';
import { PaymentRoutes } from './modules/payment/payment.route';
import { ReviewRoutes } from './modules/review/review.route';
import { AdminRoutes } from './modules/admin/admin.route';
import config from './config/index';


const app: Application = express();

// Core middlewares
app.use(
  cors({
    origin: config.env === 'production' ? config.frontend_url : true,
    credentials: true,
  }),
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/', (req: Request, res: Response) => {
  res.status(httpStatus.OK).json({
    success: true,
    message: 'FixItNow API is running...!',
  });
});

// TODO: mount module routers here, e.g.
app.use('/api/auth', AuthRoutes);
app.use('/api/categories', CategoryRoutes);
app.use('/api/admin/categories', CategoryAdminRoutes);
app.use('/api/services', ServiceRoutes);
app.use('/api/technicians', TechnicianRoutes);
app.use('/api/technician', TechnicianPrivateRoutes);
app.use('/api/technician/services', TechnicianServiceRoutes);
app.use('/api/bookings', BookingRoutes);
app.use('/api/technician/bookings', TechnicianBookingRoutes);
app.use('/api/payments', PaymentRoutes);
app.use('/api/reviews', ReviewRoutes);
app.use('/api/admin', AdminRoutes);


app.use(notFound);
app.use(globalErrorHandler);

export default app;
