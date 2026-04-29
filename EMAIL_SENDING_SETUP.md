# Concrete Ops Email Sending Setup

Concrete Ops has a staged real email sending workflow for Estimates. The feature is safe to leave off until a workspace is ready for customer-facing email.

## What Send Estimate Does

When configured, office users can open an estimate and click **Send estimate**. Concrete Ops sends a professional customer email directly from the app using the configured email provider.

The email uses the short customer-facing estimate message. It does not include internal notes, office-only notes, payroll, profit, or margin information.

The estimate is marked **Sent** only after the email provider confirms the send succeeded.

## Required Environment Variables

Set these in the target Fly app environment when email sending is ready:

```text
EMAIL_PROVIDER=resend
EMAIL_FROM=Concrete Ops <estimates@yourdomain.com>
EMAIL_API_KEY=your-provider-api-key
```

Optional:

```text
EMAIL_REPLY_TO_DEFAULT=office@yourcompany.com
EMAIL_API_URL=https://api.resend.com/emails
```

Do not commit real API keys, tokens, or provider secrets to Git.

## Not Configured Behavior

If email environment variables are missing or incomplete, the app does not crash.

Clicking **Send estimate** shows:

```text
Email sending is not configured yet.
```

Copy estimate, Copy customer message, and Print estimate remain available as fallbacks.

## Send Success Behavior

After the provider confirms success:

- The estimate status changes to **Sent**.
- `sentAt` is saved.
- `sentBy` is saved.
- `sentTo` is saved.
- `emailSubject` is saved.
- `providerMessageId` is saved when the provider returns one.
- The app shows a success message such as `Estimate sent to customer@example.com.`

## Send Failure Behavior

If the provider rejects the email or the network request fails:

- The estimate is not marked Sent.
- Existing estimate status is preserved.
- The app shows the provider or safe failure message.
- The contractor can still use Copy customer message or Print estimate.

## Permissions

Only roles that can manage estimates can send estimate emails.

Field roles cannot access estimate sending. Foreman and Employee users must not see Leads, full Customers, Estimates, pricing, payroll, profit, margin, Settings, or office-only notes.

## Safe Demo Setup Checklist

Use the demo app first. Do not enable email sending on Last Yard until demo has been tested successfully.

1. Create or choose a test sender domain in the email provider.
2. Verify the sender domain according to the provider instructions.
3. Add demo app env vars only.
4. Redeploy the demo app.
5. Log into the demo app as Demo Admin.
6. Create or select a test estimate with John as the customer email.
7. Click **Send estimate**.
8. Confirm the email arrives.
9. Verify From and Reply-To.
10. Verify the customer message is professional and does not include internal notes.
11. Verify the estimate status changes to Sent.
12. Verify sent metadata is saved.
13. Test a failed send by temporarily removing or invalidating demo env vars, then confirm the estimate is not marked Sent.

## Safe Last Yard Setup Checklist

Do not enable email sending on Last Yard until it has been tested on demo first.

1. Confirm Jacob wants real estimate emails sent from Concrete Ops.
2. Confirm the sender email and reply-to email.
3. Verify the sender domain with the email provider.
4. Send a test estimate to John first from demo.
5. Send a test estimate to Jacob next, if approved.
6. Add env vars to the Last Yard Fly app only after testing.
7. Redeploy the Last Yard app.
8. Send one test estimate to John from Last Yard before sending to a real customer.
9. Confirm From, Reply-To, message body, status, and metadata.
10. Only then allow Jacob to send a real customer estimate.

## Rollback Steps

If email sending needs to be disabled:

1. Remove the email env vars from the Fly app.
2. Redeploy the app.
3. Confirm **Send estimate** returns to the not-configured state.
4. Confirm Copy estimate, Copy customer message, and Print estimate still work.

No data reset is required for rollback.

## Test Checklist

Before using email sending with a real customer:

1. Send a test estimate to John first.
2. Verify the From address.
3. Verify the Reply-To address.
4. Verify the customer message is short, professional, and customer-facing.
5. Verify internal notes are not included.
6. Verify estimate status changes to Sent only after success.
7. Verify `sentAt`, `sentTo`, and `sentBy` metadata.
8. Verify `emailSubject`.
9. Verify `providerMessageId` when available.
10. Verify a failed send does not mark the estimate Sent.
11. Verify field roles cannot access Estimates or Send estimate.
