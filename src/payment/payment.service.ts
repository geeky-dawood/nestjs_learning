import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  ForbiddenException,
} from '@nestjs/common';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from '../stripe/stripe.service';
import {
  PaymentStatus,
  PaymentEventType,
  User,
  OrderStatusEnum,
} from '../generated/prisma/client';
import { CreateCheckoutSessionDto } from '../dto/checkout session.dto';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
    private readonly config: ConfigService,
  ) {}

  async createCustomer(user: User): Promise<{ stripe_customer_id: string }> {
    if (user.stripe_customer_id) {
      return { stripe_customer_id: user.stripe_customer_id };
    }

    const customer = await this.stripeService.createAndRetrieveCustomer(user);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { stripe_customer_id: customer.id },
    });

    this.logger.log(`Stripe customer ${customer.id} saved for user ${user.id}`);
    return { stripe_customer_id: customer.id };
  }

  async createCheckoutSession(user: User, dto: CreateCheckoutSessionDto) {
    const { order_id, currency, description } = dto;

    const order = await this.prisma.order.findUnique({
      where: { id: order_id },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    if (!order) throw new NotFoundException(`Order ${order_id} not found`);
    if (order.user_id !== user.id)
      throw new ForbiddenException('Order does not belong to you');
    if (order.order_status === OrderStatusEnum.CANCELLED) {
      throw new BadRequestException('Cannot pay for a cancelled order');
    }

    const amount = order.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    const existing = await this.prisma.payment.findFirst({
      where: {
        order_id,
        user_id: user.id,
        status: { in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING] },
      },
    });

    if (existing) {
      throw new BadRequestException(
        `An active payment already exists for order ${order_id}. Payment ID: ${existing.id}`,
      );
    }

    const { stripe_customer_id } = await this.createCustomer(user);

    const payment = await this.prisma.payment.create({
      data: {
        order_id,
        amount,
        currency: currency.toLowerCase(),
        description: description ?? `Payment for order ${order_id}`,
        status: PaymentStatus.PENDING,
        user_id: user.id,
      },
    });

    await this.logActivity({
      userId: user.id,
      orderId: order_id,
      paymentId: payment.id,
      eventType: PaymentEventType.PAYMENT_INITIATED,
      currentStatus: PaymentStatus.PENDING,
      description: 'Checkout session initiated',
    });

    const productSummary = order.items.map((item) => ({
      product_id: item.product_id,
      name: item.product.title,
      category: item.product.category ?? '',
      quantity: item.quantity,
      unit_price: item.price,
    }));

    const stripeLineItems = order.items.map((item) => ({
      price_data: {
        currency: currency.toLowerCase(),
        unit_amount: item.price,
        product_data: {
          name: item.product.title,
          metadata: {
            product_id: item.product_id,
            category: item.product.category ?? '',
          },
        },
      },
      quantity: item.quantity,
    }));

    let session: Stripe.Checkout.Session;
    try {
      session = await this.stripeService.createCheckoutSession({
        customerId: stripe_customer_id,
        paymentId: payment.id,
        orderId: order_id,
        userId: user.id,
        amount,
        currency: currency.toLowerCase(),
        description: description ?? `Order #${order_id}`,
        successUrl: `${this.config.getOrThrow('CLIENT_URL')}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${this.config.getOrThrow('CLIENT_URL')}/payment/cancel?order_id=${order_id}`,
        lineItems: stripeLineItems,
        productSummary: productSummary,
      });
    } catch (error) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED },
      });

      await this.logActivity({
        userId: user.id,
        orderId: order_id,
        paymentId: payment.id,
        eventType: PaymentEventType.PAYMENT_INTENT_FAILED,
        previousStatus: PaymentStatus.PENDING,
        currentStatus: PaymentStatus.FAILED,
        description: `Stripe session creation failed: ${(error as Error).message}`,
      });

      this.logger.error(
        `Stripe session creation failed for payment ${payment.id}`,
        error,
      );
      throw new InternalServerErrorException(
        'Payment session could not be created. Please try again.',
      );
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.PROCESSING },
    });

    await this.logActivity({
      userId: user.id,
      orderId: order_id,
      paymentId: payment.id,
      eventType: PaymentEventType.CHECKOUT_SESSION_CREATED,
      previousStatus: PaymentStatus.PENDING,
      currentStatus: PaymentStatus.PROCESSING,
      description: `Stripe checkout session created: ${session.id}`,
    });

    return {
      session_id: session.id,
      checkout_url: session.url,
      payment_id: payment.id,
      expires_at: new Date(session.expires_at * 1000),
    };
  }

  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    let event: Stripe.Event;
    try {
      event = this.stripeService.constructWebhookEvent(
        rawBody,
        signature,
        this.config.getOrThrow<string>('STRIPE_WEBHOOK_SECRET'),
      );
    } catch (err) {
      this.logger.warn(
        `Webhook signature verification failed: ${(err as Error).message}`,
      );
      throw new BadRequestException(`Webhook Error: ${(err as Error).message}`);
    }

    this.logger.log(`Webhook received: ${event.type} [${event.id}]`);

    switch (event.type) {
      case 'checkout.session.async_payment_succeeded':
        await this.onSessionAsyncPaymentSucceeded(event.data.object);
        break;

      case 'checkout.session.async_payment_failed':
        await this.onSessionAsyncPaymentFailed(event.data.object);
        break;

      case 'checkout.session.completed':
        await this.onSessionCompleted(event.data.object);
        break;

      case 'checkout.session.expired':
        await this.onSessionExpired(event.data.object);
        break;

      case 'payment_intent.succeeded':
        await this.onPaymentIntentSucceeded(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await this.onPaymentIntentFailed(event.data.object);
        break;

      case 'payment_intent.canceled':
        await this.onPaymentIntentCanceled(event.data.object);
        break;

      case 'charge.refunded':
        await this.onChargeRefunded(event.data.object);
        break;

      default:
        this.logger.debug(`Unhandled webhook event type: ${event.type}`);
    }
  }

  // ─── Webhook Event Handlers ────────────────────────────────────────────────

  private async onSessionCompleted(session: Stripe.Checkout.Session) {
    const payment = await this.findPaymentByMeta(
      session.metadata?.payment_id,
      session.id,
    );
    if (!payment) return;

    // Terminal state guard — Stripe delivers webhooks at least once
    if (payment.status === PaymentStatus.SUCCEEDED) {
      this.logger.debug(
        `Payment ${payment.id} already SUCCEEDED, skipping duplicate webhook`,
      );
      return;
    }

    await this.transitionStatus(payment, PaymentStatus.SUCCEEDED, {
      eventType: PaymentEventType.PAYMENT_INTENT_SUCCEEDED,
      description: `Checkout session completed: ${session.id}`,
    });
  }

  private async onSessionExpired(session: Stripe.Checkout.Session) {
    const payment = await this.findPaymentByMeta(
      session.metadata?.payment_id,
      session.id,
    );
    if (!payment || payment.status !== PaymentStatus.PROCESSING) return;

    await this.transitionStatus(payment, PaymentStatus.EXPIRED, {
      eventType: PaymentEventType.CHECKOUT_SESSION_EXPIRED,
      description: `Checkout session expired: ${session.id}`,
    });
  }

  private async onPaymentIntentSucceeded(intent: Stripe.PaymentIntent) {
    const payment = await this.findPaymentByMeta(intent.metadata?.payment_id);
    if (!payment || payment.status === PaymentStatus.SUCCEEDED) return;

    await this.transitionStatus(payment, PaymentStatus.SUCCEEDED, {
      eventType: PaymentEventType.PAYMENT_INTENT_SUCCEEDED,
      description: `Payment intent succeeded: ${intent.id}`,
    });
  }

  private async onPaymentIntentFailed(intent: Stripe.PaymentIntent) {
    const payment = await this.findPaymentByMeta(intent.metadata?.payment_id);
    if (!payment) return;

    const reason =
      intent.last_payment_error?.message ?? 'Unknown failure reason';

    await this.transitionStatus(payment, PaymentStatus.FAILED, {
      eventType: PaymentEventType.PAYMENT_INTENT_FAILED,
      description: `Payment intent failed: ${reason}`,
    });
  }

  private async onPaymentIntentCanceled(intent: Stripe.PaymentIntent) {
    const payment = await this.findPaymentByMeta(intent.metadata?.payment_id);
    if (!payment) return;

    await this.transitionStatus(payment, PaymentStatus.CANCELED, {
      eventType: PaymentEventType.PAYMENT_INTENT_CANCELED,
      description: `Payment intent canceled: ${intent.id}`,
    });
  }

  private async onChargeRefunded(charge: Stripe.Charge) {
    this.logger.log(`Charge refunded: ${charge.id}`);
    await this.logActivity({
      userId: charge.metadata?.user_id ?? 'unknown',
      orderId: charge.metadata?.order_id,
      paymentId: charge.metadata?.payment_id ?? 'unknown',
      eventType: PaymentEventType.PAYMENT_INTENT_REFUNDED,
      description: `Charge ${charge.id} was refunded`,
    });
  }

  // ─── Query Endpoints ───────────────────────────────────────────────────────

  async getPaymentStatus(paymentId: string, userId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, user_id: userId },
      select: {
        id: true,
        order_id: true,
        amount: true,
        currency: true,
        status: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  async getPaymentLogs(paymentId: string, userId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, user_id: userId },
    });
    if (!payment) throw new NotFoundException('Payment not found');

    return this.prisma.paymentActivityLogs.findMany({
      where: { payment_id: paymentId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Fallback: sync status directly from Stripe.
   * Call from your success/cancel page if the webhook hasn't fired yet.
   */
  async syncSessionStatus(sessionId: string, userId: string) {
    const session = await this.stripeService.retrieveCheckoutSession(sessionId);
    const paymentId = session.metadata?.payment_id;

    if (!paymentId)
      throw new BadRequestException('Invalid or untracked session');

    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, user_id: userId },
    });
    if (!payment) throw new NotFoundException('Payment not found');

    const resolved =
      session.payment_status === 'paid'
        ? PaymentStatus.SUCCEEDED
        : session.status === 'expired'
          ? PaymentStatus.EXPIRED
          : payment.status;

    if (resolved !== payment.status) {
      await this.transitionStatus(payment, resolved, {
        eventType: PaymentEventType.CHECKOUT_SESSION_SYNCED,
        description: `Status synced from Stripe session ${sessionId}`,
      });
    }

    return { payment_id: paymentId, status: resolved };
  }

  // ─── Private Helpers ───────────────────────────────────────────────────────

  /**
   * Resolve a Payment record from webhook metadata.
   * Logs a warning and returns null rather than throwing, so a missing record
   * doesn't cause Stripe to retry the webhook indefinitely.
   */
  private async findPaymentByMeta(paymentId?: string, sessionId?: string) {
    if (!paymentId) {
      this.logger.warn(
        `Webhook missing payment_id metadata${sessionId ? ` (session: ${sessionId})` : ''}`,
      );
      return null;
    }

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      this.logger.warn(`Payment ${paymentId} not found in DB`);
      return null;
    }

    return payment;
  }

  /**
   * Single place for all DB status transitions + activity logging.
   * Keeps event handlers DRY and ensures every transition is logged.
   */
  private async transitionStatus(
    payment: {
      id: string;
      status: PaymentStatus;
      user_id: string;
      order_id: string;
    },
    newStatus: PaymentStatus,
    meta: { eventType: PaymentEventType; description?: string },
  ) {
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: newStatus },
    });

    await this.logActivity({
      userId: payment.user_id,
      orderId: payment.order_id,
      paymentId: payment.id,
      eventType: meta.eventType,
      previousStatus: payment.status,
      currentStatus: newStatus,
      description: meta.description,
    });

    this.logger.log(`Payment ${payment.id}: ${payment.status} → ${newStatus}`);
  }

  private async logActivity(params: {
    userId: string;
    orderId?: string;
    paymentId: string;
    eventType: PaymentEventType;
    previousStatus?: PaymentStatus;
    currentStatus?: PaymentStatus;
    description?: string;
  }) {
    try {
      await this.prisma.paymentActivityLogs.create({
        data: {
          user_id: params.userId,
          order_id: params.orderId,
          payment_id: params.paymentId,
          event_type: params.eventType,
          previous_status: params.previousStatus,
          current_status: params.currentStatus,
          description: params.description,
        },
      });
    } catch (err) {
      this.logger.error('Failed to write PaymentActivityLog — non-fatal', err);
    }
  }

  private async onSessionAsyncPaymentSucceeded(
    session: Stripe.Checkout.Session,
  ) {
    const payment = await this.findPaymentByMeta(
      session.metadata?.payment_id,
      session.id,
    );
    if (!payment || payment.status === PaymentStatus.SUCCEEDED) return;

    await this.transitionStatus(payment, PaymentStatus.SUCCEEDED, {
      eventType: PaymentEventType.PAYMENT_INTENT_SUCCEEDED,
      description: `Async payment succeeded via session ${session.id}`,
    });
  }

  private async onSessionAsyncPaymentFailed(session: Stripe.Checkout.Session) {
    const payment = await this.findPaymentByMeta(
      session.metadata?.payment_id,
      session.id,
    );
    if (!payment) return;

    await this.transitionStatus(payment, PaymentStatus.FAILED, {
      eventType: PaymentEventType.PAYMENT_INTENT_FAILED,
      description: `Async payment failed via session ${session.id}`,
    });
  }
}
