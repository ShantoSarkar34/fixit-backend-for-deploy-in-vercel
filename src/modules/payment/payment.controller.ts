import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import ApiError from '../../utils/ApiError';
import { PaymentService } from './payment.service';
import { TCreatePaymentPayload, TPaymentFilters } from './payment.interface';

const createPayment = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.createPayment(
    req.user!.id,
    req.body as TCreatePaymentPayload,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Checkout session created. Open the checkoutUrl in a browser to complete payment.',
    data: result,
  });
});

const getPayments = catchAsync(async (req: Request, res: Response) => {
  const payments = await PaymentService.getPayments(
    { id: req.user!.id, role: req.user!.role },
    req.query as unknown as TPaymentFilters,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Payments retrieved successfully',
    data: payments,
  });
});

const getPaymentById = catchAsync(async (req: Request, res: Response) => {
  const payment = await PaymentService.getPaymentById(
    { id: req.user!.id, role: req.user!.role },
    Number(req.params.id),
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Payment retrieved successfully',
    data: payment,
  });
});

// Stripe calls this directly (no auth cookie, no JSON body parsing) - see app.ts
// for the raw-body wiring this route requires.
const handleWebhook = catchAsync(async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'];

  if (!signature || Array.isArray(signature)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Missing Stripe-Signature header');
  }

  await PaymentService.handleWebhookEvent(req.body, signature);

  res.status(httpStatus.OK).json({ received: true });
});

// Public landing pages Stripe's Checkout redirects the browser to - no auth,
// since Stripe doesn't carry your app's JWT cookie when it redirects the user.
const paymentSuccess = catchAsync(async (req: Request, res: Response) => {
  const sessionId = req.query.session_id as string | undefined;
  const payment = sessionId
    ? await PaymentService.syncPaymentFromStripeSession(sessionId)
    : null;
  const status = payment?.status ?? 'PROCESSING';

  res.status(httpStatus.OK).send(`
    <html>
      <body style="font-family: sans-serif; text-align: center; margin-top: 80px;">
        <h1>${status === 'COMPLETED' ? '.js Payment Successful' : '⏳ Payment Processing'}</h1>
        <p>Booking status will update shortly once the payment webhook is received.</p>
        ${sessionId ? `<p style="color:#888">Session: ${sessionId}</p>` : ''}
      </body>
    </html>
  `);
});

const paymentCancel = catchAsync(async (req: Request, res: Response) => {
  res.status(httpStatus.OK).send(`
    <html>
      <body style="font-family: sans-serif; text-align: center; margin-top: 80px;">
        <h1> Payment Cancelled</h1>
        <p>You can try paying again from your booking.</p>
      </body>
    </html>
  `);
});

export const PaymentController = {
  createPayment,
  getPayments,
  getPaymentById,
  handleWebhook,
  paymentSuccess,
  paymentCancel,
};