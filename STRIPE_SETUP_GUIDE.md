# Stripe Setup Guide for Eato

This guide explains how to set up Stripe Products and configure your subscription system with role-specific pricing.

## Overview

Eato now supports **three user roles** with different subscription tiers:

| Role | Basic Plan | Pro Plan |
|------|-----------|----------|
| **Foodie / App User** | $4.99/month | $19.99/month |
| **Food Truck Owner** | $49/month | $149/month |
| **Event Organizer** | $49/month | $99/month |

## Step 1: Create Products in Stripe Dashboard

Go to [Stripe Dashboard](https://dashboard.stripe.com/) → **Products** and create the following products:

### 1. User Plans (Foodies)

**Product: User Basic**
- Name: `User Basic`
- Description: `Entry plan for app users. Unlocks enhanced discovery features, favorites, and alerts.`
- Pricing: **$4.99 USD / month** (recurring)
- After creation, copy the **Price ID** (starts with `price_`)
- Save as: `STRIPE_PRICE_USER_BASIC`

**Product: User Pro**
- Name: `User Pro`
- Description: `Pro tools for power users. Priority alerts, advanced filters, and unlimited favorites.`
- Pricing: **$19.99 USD / month** (recurring)
- After creation, copy the **Price ID**
- Save as: `STRIPE_PRICE_USER_PRO`

### 2. Food Truck Plans

**Product: Food Truck Basic**
- Name: `Food Truck Basic`
- Description: `Starter tools for food trucks: profile listing, schedule management, event board access.`
- Pricing: **$49.00 USD / month** (recurring)
- After creation, copy the **Price ID**
- Save as: `STRIPE_PRICE_TRUCK_BASIC`

**Product: Food Truck Pro**
- Name: `Food Truck Pro`
- Description: `Advanced tools for fleets and growth: featured placement, analytics, auto-bidding.`
- Pricing: **$149.00 USD / month** (recurring)
- After creation, copy the **Price ID**
- Save as: `STRIPE_PRICE_TRUCK_PRO`

### 3. Event Organizer Plans

**Product: Organizer Basic**
- Name: `Organizer Basic`
- Description: `Post events and receive truck applications. Perfect for small recurring venues.`
- Pricing: **$49.00 USD / month** (recurring)
- After creation, copy the **Price ID**
- Save as: `STRIPE_PRICE_ORG_BASIC`

**Product: Organizer Pro**
- Name: `Organizer Pro`
- Description: `Unlimited event postings, invitations, analytics, premium placement.`
- Pricing: **$99.00 USD / month** (recurring)
- After creation, copy the **Price ID**
- Save as: `STRIPE_PRICE_ORG_PRO`

## Step 2: Create Webhook Endpoint

In your Stripe Dashboard → **Developers** → **Webhooks**:

1. Click **"Add endpoint"**
2. Enter your webhook URL:
   ```
   https://your-repl-url.replit.app/api/subscription/webhook
   ```
3. Select these events to listen to:
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
4. Click **"Add endpoint"**
5. Copy the **Signing secret** (starts with `whsec_`)
6. Save as: `STRIPE_WEBHOOK_SECRET`

## Step 3: Configure Environment Variables in Replit

**IMPORTANT:** Use Replit's **Secrets** tab (🔒 in the sidebar) to add these values:

### Required Stripe Secrets:

```
STRIPE_SECRET_KEY=sk_test_... (or sk_live_... for production)
STRIPE_WEBHOOK_SECRET=whsec_...

# User/Foodie Plans
STRIPE_PRICE_USER_BASIC=price_...
STRIPE_PRICE_USER_PRO=price_...

# Food Truck Plans
STRIPE_PRICE_TRUCK_BASIC=price_...
STRIPE_PRICE_TRUCK_PRO=price_...

# Event Organizer Plans
STRIPE_PRICE_ORG_BASIC=price_...
STRIPE_PRICE_ORG_PRO=price_...
```

## Step 4: Enable Webhook Signature Verification (PRODUCTION ONLY)

Before going to production, you **MUST** enable webhook signature verification:

1. Open `server/routes.ts`
2. Find line ~740 in the subscription webhook handler
3. Uncomment and implement the signature verification code:

```typescript
// BEFORE (Development/Testing):
event = req.body;

// AFTER (Production):
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
if (!webhookSecret) {
  throw new Error('STRIPE_WEBHOOK_SECRET not configured');
}
event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
```

This prevents unauthorized requests from spoofing subscription events.

## Step 5: Test Your Setup

1. Navigate to `/profile` and select a user role (Foodie, Food Truck, or Event Organizer)
2. Navigate to `/subscription` 
3. You should see pricing specific to your role
4. Click "Subscribe to Basic" or "Upgrade to Pro"
5. Complete the Stripe checkout (use test card: `4242 4242 4242 4242`)
6. You'll be redirected back to your dashboard
7. Check that your subscription tier badge appears in the header dropdown

## Test Cards (Stripe Test Mode)

- **Success**: `4242 4242 4242 4242`
- **Requires Authentication**: `4000 0025 0000 3155`
- **Declined**: `4000 0000 0000 9995`

Use any future expiration date and any CVC code.

## How It Works

1. **User selects role** during profile completion
2. **Subscription page** shows role-specific pricing automatically
3. **Checkout** creates a Stripe subscription with the correct price
4. **Webhook** confirms the subscription and updates the database
5. **Badge** appears in the header showing the active tier

## Troubleshooting

### "Subscription pricing not configured" error
- Check that all 6 Price IDs are added to Replit Secrets
- Ensure the Price IDs match exactly (copy-paste from Stripe Dashboard)
- Restart your application after adding secrets

### Webhook not working
- Verify the webhook URL matches your Replit URL
- Check that all 4 events are selected in Stripe Dashboard
- Ensure STRIPE_WEBHOOK_SECRET is set in Replit Secrets

### Wrong pricing displayed
- Check that your user profile has a role selected
- Navigate to `/profile` to verify your role
- Refresh the subscription page after changing roles

## Questions?

Review the `.env.example` file in the `server/` directory for the complete list of required environment variables.
