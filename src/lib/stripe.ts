import Stripe from 'stripe';
import config from '../config/index';

if (!config.payment.stripe_secret_key) {
  throw new Error('STRIPE_SECRET_KEY is not set. Did you add it to your .env file?');
}

const stripe = new Stripe(config.payment.stripe_secret_key);

export default stripe;