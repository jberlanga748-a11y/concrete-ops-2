# Website Lead Intake

Apex HQ website lead intake is a server-to-server integration for contractor websites that need to create leads in the correct company/workspace.

## Endpoint

`POST /api/integrations/website-leads`

Authentication:

- Requires `Authorization: Bearer <APEX_HQ_IMPORT_TOKEN>`.
- The token must only be used from a trusted website backend or serverless route.
- Never expose the integration token in public frontend JavaScript, form markup, analytics tags, or browser requests.

Correct future flow:

`Website form frontend -> website backend/serverless route -> Apex HQ website lead intake API`

Incorrect flow:

`Website frontend JavaScript -> Apex HQ with the integration token`

## Package Format

```json
{
  "packageType": "contractor_ops_website_lead",
  "sourceApp": "Website Form",
  "sourceSubmissionId": "optional unique form submission id",
  "targetCompanyId": "COMPANY-DEFAULT",
  "website": {
    "siteName": "Contractor Website",
    "pageUrl": "https://example.com/request-estimate",
    "formName": "Request Estimate",
    "campaign": "Google Ads - Fencing",
    "medium": "website",
    "source": "Website"
  },
  "lead": {
    "serviceType": "Fencing",
    "projectType": "Fence repair",
    "customerName": "Customer Name",
    "companyName": "",
    "contactName": "Customer Name",
    "contactEmail": "customer@example.com",
    "contactPhone": "555-555-5555",
    "address": "",
    "city": "Albany",
    "state": "OR",
    "zip": "",
    "description": "Customer message",
    "timeline": "ASAP",
    "budgetRange": "",
    "preferredContactMethod": "Call",
    "photosNote": "",
    "consentToContact": true,
    "contactByPhone": true,
    "contactByEmail": true,
    "contactByText": false
  },
  "meta": {
    "referrer": "",
    "utmSource": "",
    "utmMedium": "",
    "utmCampaign": "",
    "ipAddress": "",
    "userAgent": ""
  },
  "honeypot": ""
}
```

## Behavior

- `targetCompanyId` is required and must match an existing Apex HQ company/workspace.
- Created leads are scoped to `targetCompanyId`.
- The endpoint creates a lead only. It does not create customers, jobs, estimates, users, emails, SMS messages, AI drafts, or customer portal records.
- Duplicate checks are scoped to the target company. A duplicate in one company does not block the same submission from being imported into another company.
- Honeypot submissions are ignored safely and do not create leads.
- Token-like query params and sensitive fields such as API keys, passwords, tokens, secrets, sessions, authorization values, and codes are stripped before notes are saved.

## Notes For Website Implementations

- Keep validation and spam controls on the website backend before forwarding to Apex HQ.
- Use a stable `sourceSubmissionId` when the website platform provides one.
- Pass the intended `targetCompanyId` explicitly for each contractor website.
- Store consent fields as lead context only for now. Email/SMS sending and compliance workflows are separate future phases.
