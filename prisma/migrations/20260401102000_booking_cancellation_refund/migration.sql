-- Add booking cancellation lifecycle states
ALTER TYPE "RequestStatus" ADD VALUE IF NOT EXISTS 'CANCELLATION_REQUESTED';
ALTER TYPE "RequestStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

-- Add refund state for payments
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'REFUNDED';
