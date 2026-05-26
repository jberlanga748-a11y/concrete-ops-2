import { DEFAULT_COMPANY_NAME } from "./brand-utils.js";

function normalizeObjectArray(value, fallback = []) {
  if (Array.isArray(value)) {
    return value.filter((item) => item && typeof item === "object");
  }
  if (Array.isArray(fallback)) {
    return fallback.filter((item) => item && typeof item === "object");
  }
  return [];
}

function firstMobileText(...values) {
  return values.find((value) => typeof value === "string" && value.trim())?.trim() || "";
}

function normalizeMobileContactKey(value) {
  return String(value || "").trim().toLowerCase();
}

function ownerMobileParseSiteContact(value = "") {
  const text = firstMobileText(value);
  if (!text) return {};
  const phoneMatch = text.match(/(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/);
  const phone = phoneMatch?.[0]?.trim() || "";
  const name = phone ? text.replace(phone, "").replace(/\s*[-/|,]\s*$/, "").trim() : text;
  return { name, phone };
}

function ownerMobileContactFromCustomer(customer = {}) {
  if (!customer || typeof customer !== "object") return {};
  return {
    name: firstMobileText(customer.name, customer.company, customer.customer),
    phone: firstMobileText(customer.phone, customer.contactPhone, customer.primaryPhone),
    email: firstMobileText(customer.email, customer.contactEmail, customer.primaryEmail),
    moduleId: "customers",
    recordId: customer.id || "",
    sourceLabel: "Customer",
  };
}

function ownerMobileMergeContact(...contacts) {
  return contacts.reduce((merged, contact) => {
    if (!contact || typeof contact !== "object") return merged;
    return {
      name: merged.name || contact.name || "",
      phone: merged.phone || contact.phone || "",
      email: merged.email || contact.email || "",
      moduleId: merged.moduleId || contact.moduleId || "",
      recordId: merged.recordId || contact.recordId || "",
      sourceLabel: merged.sourceLabel || contact.sourceLabel || "",
    };
  }, { name: "", phone: "", email: "", moduleId: "", recordId: "", sourceLabel: "" });
}

export function buildOwnerMobileContactDirectory({ customers = [], leads = [], jobs = [] } = {}) {
  const customerById = new Map();
  const customerByName = new Map();
  normalizeObjectArray(customers).forEach((customer) => {
    if (customer.id) customerById.set(String(customer.id), customer);
    [customer.name, customer.company, customer.customer].forEach((name) => {
      const key = normalizeMobileContactKey(name);
      if (key && !customerByName.has(key)) customerByName.set(key, customer);
    });
  });

  const leadById = new Map();
  normalizeObjectArray(leads).forEach((lead) => {
    if (lead.id) leadById.set(String(lead.id), lead);
  });

  const jobById = new Map();
  normalizeObjectArray(jobs).forEach((job) => {
    if (job.id) jobById.set(String(job.id), job);
  });

  return { customerById, customerByName, leadById, jobById };
}

function ownerMobileLinkedRecordContact(record = {}, directory = {}) {
  if (!record || typeof record !== "object") return {};
  const linkedJob = record.jobId ? directory.jobById?.get(String(record.jobId)) : null;
  const lead = record.leadId ? directory.leadById?.get(String(record.leadId)) : linkedJob?.leadId ? directory.leadById?.get(String(linkedJob.leadId)) : null;
  const customerId = firstMobileText(record.customerId, record.customer?.id, lead?.customerId, linkedJob?.customerId);
  const customerName = firstMobileText(
    typeof record.customer === "string" ? record.customer : "",
    record.customerName,
    lead?.customer,
    linkedJob?.customer,
  );
  const customer = customerId
    ? directory.customerById?.get(String(customerId))
    : directory.customerByName?.get(normalizeMobileContactKey(customerName));
  const leadContact = lead ? {
    name: firstMobileText(lead.contactName, lead.customer, lead.project),
    phone: firstMobileText(lead.contactPhone),
    email: firstMobileText(lead.contactEmail),
    moduleId: "leads",
    recordId: lead.id || "",
    sourceLabel: "Lead",
  } : {};
  return ownerMobileMergeContact(ownerMobileContactFromCustomer(customer), leadContact);
}

export function ownerMobileRecordContact(record = {}, directory = {}) {
  const customer = record.customer && typeof record.customer === "object" ? record.customer : {};
  const siteContact = ownerMobileParseSiteContact(record.siteContact);
  const directContact = {
    name: firstMobileText(record.contactName, siteContact.name, record.customerName, customer.name, customer.company, record.customer, record.title, record.project),
    phone: firstMobileText(record.contactPhone, record.customerPhone, record.phone, customer.phone, customer.contactPhone, record.primaryPhone, siteContact.phone),
    email: firstMobileText(record.contactEmail, record.customerEmail, record.email, customer.email, customer.contactEmail, record.primaryEmail),
  };
  return ownerMobileMergeContact(directContact, ownerMobileLinkedRecordContact(record, directory), siteContact);
}

function ownerMobileSafeDraftText(value = "") {
  return firstMobileText(value)
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/\b(?:internal notes?|backup|sov|source urls?|private urls?|margin|cost basis)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function ownerMobileSafeContactDraft(item = {}, companyName = DEFAULT_COMPANY_NAME) {
  const recordTitle = ownerMobileSafeDraftText(item.title) || "your project";
  const status = ownerMobileSafeDraftText(item.statusLabel || item.status || item.eyebrow) || "needs review";
  const safeSummary = ownerMobileSafeDraftText(item.publicSummary) || "I have an Apex HQ update to review with you.";
  const body = `Hi ${item.contact?.name || "there"}, this is ${companyName}. Quick update on ${recordTitle}: ${safeSummary} Current status: ${status}. Please reply when you have a minute.`;
  return {
    subject: `${companyName}: ${recordTitle}`,
    textDraft: body,
    emailBody: `${body}\n\nManual draft only. Nothing was sent automatically from Apex HQ.`,
  };
}
