import httpStatus from 'http-status';
import Stripe from 'stripe';
import prisma from '../../lib/prisma';
import stripe from '../../lib/stripe';
import ApiError from '../../utils/ApiError';
import config from '../../config/index';
import { Prisma, Role, PaymentStatus } from '../../../prisma/generated/index';
import { TCreatePaymentPayload, TPaymentFilters } from './payment.interface';

const paymentIncludes = {
  booking: {
    include: {
      service: { include: { category: true } },
      customer: { select: { id: true, name: true, email: true } },
      technician: { select: { id: true, name: true, email: true } },
    },
  },
} satisfies Prisma.PaymentInclude;

const createPayment = async (customerId: number, payload: TCreatePaymentPayload) => {
  const { bookingId } = payload;

  if (!bookingId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'bookingId is required');
  }

  const booking = await prisma.booking.findUnique({
    where: { id: Number(bookingId) },
    include: { service: true, payment: true },
  });

  if (!booking) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Booking not found');
  }

  if (booking.customerId !== customerId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You can only pay for your own bookings');
  }

  if (booking.status !== 'ACCEPTED') {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Payment can only be made for an ACCEPTED booking (current status: ${booking.status})`,
    );
  }

  if (booking.payment) {
    throw new ApiError(httpStatus.CONFLICT, 'This booking has already been paid for');
  }

  const amount = Number(booking.service.price);
  const amountInCents = Math.round(amount * 100);

  let session: Stripe.Checkout.Session;

  try {
    session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: booking.service.title },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      success_url: `${config.app_base_url}/api/payments/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.app_base_url}/api/payments/cancel`,
      metadata: {
        bookingId: String(booking.id),
        customerId: String(customerId),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Payment session creation failed';
    throw new ApiError(httpStatus.BAD_REQUEST, `Stripe error: ${message}`);
  }

  const payment = await prisma.payment.create({
    data: {
      bookingId: booking.id,
      customerId,
      amount,
      method: 'card',
      provider: 'STRIPE',
      transactionId: session.id,
      status: 'PENDING',
    },
    include: paymentIncludes,
  });

  // checkoutUrl is what the customer opens in a browser to actually pay
  return { payment, checkoutUrl: session.url };
};

const getPaymentBySessionId = async (sessionId: string) => {
  return prisma.payment.findUnique({
    where: { transactionId: sessionId },
    include: paymentIncludes,
  });
};

// Called from the success-page route as a fallback/self-heal in case the
// webhook hasn't been delivered yet (e.g. stripe listen wasn't running, or its
// signing secret is stale). Not a replacement for the webhook - just makes
// local testing far less fragile.
const syncPaymentFromStripeSession = async (sessionId: string) => {
  const payment = await prisma.payment.findUnique({ where: { transactionId: sessionId } });

  if (!payment) {
    return null;
  }

  if (payment.status === 'COMPLETED') {
    return payment;
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.payment_status === 'paid') {
    return prisma.payment.update({
      where: { transactionId: sessionId },
      data: { status: 'COMPLETED', paidAt: new Date() },
    });
  }

  return payment;
};

const handleWebhookEvent = async (rawBody: Buffer, signature: string) => {
  if (!config.payment.stripe_webhook_secret) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'STRIPE_WEBHOOK_SECRET is not configured',
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      config.payment.stripe_webhook_secret,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid signature';
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Webhook signature verification failed: ${message}`,
    );
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    await prisma.payment.updateMany({
      where: { transactionId: session.id },
      data: { status: 'COMPLETED', paidAt: new Date() },
    });
  }

  if (event.type === 'checkout.session.async_payment_failed') {
    const session = event.data.object as Stripe.Checkout.Session;

    await prisma.payment.updateMany({
      where: { transactionId: session.id },
      data: { status: 'FAILED' },
    });
  }
};

const getPayments = async (requester: { id: number; role: Role }, filters: TPaymentFilters) => {
  const { status, bookingId } = filters;

  const where: Prisma.PaymentWhereInput = {};

  if (status) {
    where.status = status as PaymentStatus;
  }

  if (bookingId) {
    where.bookingId = Number(bookingId);
  }

  if (requester.role === 'CUSTOMER') {
    where.customerId = requester.id;
  }
  // ADMIN sees everything, optionally narrowed by the filters above

  return prisma.payment.findMany({
    where,
    include: paymentIncludes,
    orderBy: { id: 'desc' },
  });
};

const getPaymentById = async (requester: { id: number; role: Role }, id: number) => {
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: paymentIncludes,
  });

  if (!payment) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Payment not found');
  }

  const canAccess = requester.role === 'ADMIN' || payment.customerId === requester.id;

  if (!canAccess) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have access to this payment');
  }

  return payment;
};

export const PaymentService = {
  createPayment,
  handleWebhookEvent,
  getPayments,
  getPaymentById,
  getPaymentBySessionId,
  syncPaymentFromStripeSession,
};