# Webhook URL Configuration for Replit

## 📍 How to Get Your Webhook URL

Replit **does not** have an `APP_URL` environment variable. Instead, URLs are determined automatically based on your environment.

### Development Environment

1. **Start your application** (it's already running)
2. **Open the Webview** preview panel
3. **Look at the URL bar** - it will show something like:
   ```
   https://your-repl-name.your-username.repl.co
   ```
4. **Copy this URL** and use it to construct your webhook endpoint:
   ```
   https://your-repl-name.your-username.repl.co/api/stripe/webhook
   https://your-repl-name.your-username.repl.co/api/subscription/webhook
   ```

### Production Environment (After Publishing)

1. **Publish your application** (click "Publish" or "Deploy")
2. Your app will get a `.replit.app` URL like:
   ```
   https://your-app-name.replit.app
   ```
3. **Update your Stripe webhooks** to use:
   ```
   https://your-app-name.replit.app/api/stripe/webhook
   https://your-app-name.replit.app/api/subscription/webhook
   ```

---

## 🔧 Automatic URL Detection

Your code now **automatically detects** the correct URL using Replit's environment variables:

```typescript
const baseUrl = process.env.REPLIT_DEPLOYMENT 
  ? `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}` // Production
  : process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}` // Development
    : 'http://localhost:5000'; // Local fallback
```

**Environment Variables Replit Provides:**
- `REPLIT_DEV_DOMAIN` - Your development `.repl.co` domain
- `REPLIT_DOMAINS` - Your published domains (comma-separated)
- `REPLIT_DEPLOYMENT` - Set to `1` when published

---

## 🎯 Setting Up Stripe Webhooks

### Step 1: Get Your Current Development URL

Run this command in the Shell to see your current URL:
```bash
echo "https://${REPLIT_DEV_DOMAIN}"
```

Or check the Webview preview URL bar.

### Step 2: Configure Stripe Webhooks

Go to [Stripe Dashboard](https://dashboard.stripe.com/) → **Developers** → **Webhooks**:

**For Development Testing:**
1. Add endpoint: `https://your-repl-name.your-username.repl.co/api/stripe/webhook`
2. Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`
3. Add another endpoint: `https://your-repl-name.your-username.repl.co/api/subscription/webhook`
4. Select events: `checkout.session.completed`, `customer.subscription.*`

**For Production (After Publishing):**
1. Update endpoints to use your `.replit.app` URL
2. Enable webhook signature verification (see STRIPE_SETUP_GUIDE.md)

---

## ⚠️ Important Notes

1. **Development URLs change** when you restart your Repl - you may need to update Stripe webhooks
2. **Production URLs are stable** - `.replit.app` domains don't change
3. **No manual configuration needed** - Your app automatically constructs the correct URLs
4. **Webhook signatures** should be verified in production (currently disabled for development)

---

## 🧪 Testing Your Webhooks

After configuring webhooks in Stripe:

1. **Trigger a test payment** - Create a booking and pay the deposit
2. **Check Stripe Dashboard** → **Developers** → **Webhooks** → Click your endpoint
3. **View webhook attempts** - You should see successful `200` responses
4. **Check your app logs** - Look for "Payment succeeded for booking #X"

If webhooks fail:
- ✅ Verify the URL is correct and accessible
- ✅ Check that your app is running
- ✅ Ensure Stripe can reach your Repl (not behind a firewall)
- ✅ Review the webhook event logs in Stripe Dashboard
