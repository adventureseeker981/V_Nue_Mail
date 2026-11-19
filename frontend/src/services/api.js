// src/services/api.js - Comprehensive API Client for Encrypto
// Centralized API Base URL configuration:
// In production on Vercel, read from VITE_API_BASE_URL (e.g. 'https://encrypto-inky.vercel.app').
// In local development, fall back to '/api' so the Vite dev server proxies to http://localhost:3001.

function resolveApiBaseUrl() {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (!envUrl) return '/api';

  const clean = envUrl.trim().replace(/\/+$/, '');
  return clean.endsWith('/api') ? clean : `${clean}/api`;
}

export const API_BASE_URL = resolveApiBaseUrl();

// Helper function to get the stored JWT token
function getAuthHeader() {
  const token = localStorage.getItem('token');
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

// Helper to safely parse JSON responses with friendly error fallbacks
async function parseJsonResponse(response) {
  const text = await response.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : {};
  } catch (e) {
    data = null;
  }

  if (!response.ok) {
    if (
      !data ||
      text.includes('ECONNREFUSED') ||
      response.status === 502 ||
      response.status === 503 ||
      response.status === 504
    ) {
      throw new Error('Unable to connect to the server. Please try again.');
    }

    const message =
      data?.error ||
      data?.message ||
      'Unable to connect to the server. Please try again.';
    throw new Error(message);
  }

  return data || {};
}

// ---------------------------------------------------------------------------
// Authentication API Calls
// ---------------------------------------------------------------------------

export async function loginUser(email, password) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  } catch (netErr) {
    throw new Error('Unable to connect to the server. Please try again.');
  }

  const data = await parseJsonResponse(response);

  if (data.token) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
  }

  return data;
}

export async function signupUser(displayName, email, password) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: displayName,
        displayName: displayName,
        display_name: displayName,
        email: email,
        password: password,
      }),
    });
  } catch (netErr) {
    throw new Error('Unable to connect to the server. Please try again.');
  }

  const data = await parseJsonResponse(response);

  if (data.token) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
  }

  return data;
}

export async function getCurrentUser() {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: { ...getAuthHeader() },
  });

  return await parseJsonResponse(response);
}

export function logoutUser() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

// ---------------------------------------------------------------------------
// Folder Views & Message Retrieval
// ---------------------------------------------------------------------------

export async function fetchInbox(category = '') {
  const url = category && category !== 'all'
    ? `${API_BASE_URL}/emails/inbox?category=${encodeURIComponent(category)}`
    : `${API_BASE_URL}/emails/inbox`;

  const response = await fetch(url, {
    headers: { ...getAuthHeader() },
  });

  const data = await parseJsonResponse(response);
  return data.messages || [];
}

export async function fetchStarred() {
  const response = await fetch(`${API_BASE_URL}/emails/starred`, {
    headers: { ...getAuthHeader() },
  });
  const data = await parseJsonResponse(response);
  return data.messages || [];
}

export async function fetchSnoozed() {
  const response = await fetch(`${API_BASE_URL}/emails/snoozed`, {
    headers: { ...getAuthHeader() },
  });
  const data = await parseJsonResponse(response);
  return data.messages || [];
}

export async function fetchSent() {
  const response = await fetch(`${API_BASE_URL}/emails/sent`, {
    headers: { ...getAuthHeader() },
  });
  const data = await parseJsonResponse(response);
  return data.messages || [];
}

export async function fetchDrafts() {
  const response = await fetch(`${API_BASE_URL}/emails/drafts`, {
    headers: { ...getAuthHeader() },
  });
  const data = await parseJsonResponse(response);
  return data.messages || [];
}

export async function fetchImportant() {
  const response = await fetch(`${API_BASE_URL}/emails/important`, {
    headers: { ...getAuthHeader() },
  });
  const data = await parseJsonResponse(response);
  return data.messages || [];
}

export async function fetchAllMail() {
  const response = await fetch(`${API_BASE_URL}/emails/all-mail`, {
    headers: { ...getAuthHeader() },
  });
  const data = await parseJsonResponse(response);
  return data.messages || [];
}

export async function fetchSpam() {
  const response = await fetch(`${API_BASE_URL}/emails/spam`, {
    headers: { ...getAuthHeader() },
  });
  const data = await parseJsonResponse(response);
  return data.messages || [];
}

export async function fetchTrash() {
  const response = await fetch(`${API_BASE_URL}/emails/trash`, {
    headers: { ...getAuthHeader() },
  });
  const data = await parseJsonResponse(response);
  return data.messages || [];
}

export async function fetchCounts() {
  const response = await fetch(`${API_BASE_URL}/emails/counts`, {
    headers: { ...getAuthHeader() },
  });
  const data = await parseJsonResponse(response);
  return data.counts || {};
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export async function searchEmails(params = {}) {
  const queryParams = new URLSearchParams();
  Object.keys(params).forEach((key) => {
    if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
      queryParams.append(key, params[key]);
    }
  });

  const response = await fetch(`${API_BASE_URL}/emails/search?${queryParams.toString()}`, {
    headers: { ...getAuthHeader() },
  });

  const data = await parseJsonResponse(response);
  return data.messages || [];
}

// ---------------------------------------------------------------------------
// Single Message Operations
// ---------------------------------------------------------------------------

export async function fetchEmailById(id) {
  const response = await fetch(`${API_BASE_URL}/emails/${id}`, {
    headers: { ...getAuthHeader() },
  });

  const data = await parseJsonResponse(response);
  return data.message;
}

export async function sendEmail({
  recipient,
  cc,
  bcc,
  subject,
  body,
  body_html,
  attachments,
  is_confidential,
  scheduled_for,
  draftId,
  category,
}) {
  const response = await fetch(`${API_BASE_URL}/emails/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify({
      recipient,
      cc,
      bcc,
      subject,
      body,
      body_html,
      attachments,
      is_confidential,
      scheduled_for,
      draftId,
      category,
    }),
  });

  return await parseJsonResponse(response);
}

export async function saveDraft({
  id,
  recipient,
  cc,
  bcc,
  subject,
  body,
  body_html,
  attachments,
  is_confidential,
}) {
  const response = await fetch(`${API_BASE_URL}/emails/drafts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify({
      id,
      recipient,
      cc,
      bcc,
      subject,
      body,
      body_html,
      attachments,
      is_confidential,
    }),
  });

  return await parseJsonResponse(response);
}

export async function discardDraft(id) {
  const response = await fetch(`${API_BASE_URL}/emails/drafts/${id}`, {
    method: 'DELETE',
    headers: { ...getAuthHeader() },
  });

  return await parseJsonResponse(response);
}

export async function markEmailAsRead(id) {
  const response = await fetch(`${API_BASE_URL}/emails/${id}/read`, {
    method: 'PATCH',
    headers: { ...getAuthHeader() },
  });

  return await parseJsonResponse(response);
}

export async function markEmailAsUnread(id) {
  const response = await fetch(`${API_BASE_URL}/emails/${id}/unread`, {
    method: 'PATCH',
    headers: { ...getAuthHeader() },
  });

  return await parseJsonResponse(response);
}

export async function toggleStar(id) {
  const response = await fetch(`${API_BASE_URL}/emails/${id}/star`, {
    method: 'PATCH',
    headers: { ...getAuthHeader() },
  });

  return await parseJsonResponse(response);
}

export async function toggleImportant(id) {
  const response = await fetch(`${API_BASE_URL}/emails/${id}/important`, {
    method: 'PATCH',
    headers: { ...getAuthHeader() },
  });

  return await parseJsonResponse(response);
}

export async function archiveEmail(id) {
  const response = await fetch(`${API_BASE_URL}/emails/${id}/archive`, {
    method: 'POST',
    headers: { ...getAuthHeader() },
  });

  return await parseJsonResponse(response);
}

export async function unarchiveEmail(id) {
  const response = await fetch(`${API_BASE_URL}/emails/${id}/unarchive`, {
    method: 'POST',
    headers: { ...getAuthHeader() },
  });

  return await parseJsonResponse(response);
}

export async function reportSpam(id) {
  const response = await fetch(`${API_BASE_URL}/emails/${id}/spam`, {
    method: 'POST',
    headers: { ...getAuthHeader() },
  });

  return await parseJsonResponse(response);
}

export async function unmarkSpam(id) {
  const response = await fetch(`${API_BASE_URL}/emails/${id}/unspam`, {
    method: 'POST',
    headers: { ...getAuthHeader() },
  });

  return await parseJsonResponse(response);
}

export async function snoozeEmail(id, until) {
  const response = await fetch(`${API_BASE_URL}/emails/${id}/snooze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify({ until }),
  });

  return await parseJsonResponse(response);
}

// Move email to Trash (soft delete)
export async function deleteEmail(id, folder = '') {
  const url = folder
    ? `${API_BASE_URL}/emails/${id}?folder=${encodeURIComponent(folder)}`
    : `${API_BASE_URL}/emails/${id}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: { ...getAuthHeader() },
  });

  if (!response.ok) {
    return await parseJsonResponse(response);
  }

  return true;
}

// Restore email from Trash back to Inbox or Sent
export async function restoreEmail(id) {
  const response = await fetch(`${API_BASE_URL}/emails/${id}/restore`, {
    method: 'POST',
    headers: { ...getAuthHeader() },
  });

  return await parseJsonResponse(response);
}

// Permanently delete single email from Trash
export async function deleteEmailPermanently(id) {
  const response = await fetch(`${API_BASE_URL}/emails/${id}/permanent`, {
    method: 'DELETE',
    headers: { ...getAuthHeader() },
  });

  if (!response.ok) {
    return await parseJsonResponse(response);
  }

  return true;
}

// Permanently empty all emails in Trash for the current user
export async function emptyTrash() {
  const response = await fetch(`${API_BASE_URL}/emails/trash/empty`, {
    method: 'DELETE',
    headers: { ...getAuthHeader() },
  });

  if (!response.ok) {
    return await parseJsonResponse(response);
  }

  return true;
}

// ---------------------------------------------------------------------------
// Bulk Actions
// ---------------------------------------------------------------------------

export async function bulkAction(ids, action, value = null) {
  const response = await fetch(`${API_BASE_URL}/emails/bulk`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify({ ids, action, value }),
  });

  return await parseJsonResponse(response);
}

// ---------------------------------------------------------------------------
// Custom Labels API Calls
// ---------------------------------------------------------------------------

export async function fetchLabels() {
  const response = await fetch(`${API_BASE_URL}/labels`, {
    headers: { ...getAuthHeader() },
  });
  const data = await parseJsonResponse(response);
  return data.labels || [];
}

export async function createLabel(name, color = '#299EFF') {
  const response = await fetch(`${API_BASE_URL}/labels`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify({ name, color }),
  });

  const data = await parseJsonResponse(response);
  return data.label;
}

export async function deleteLabel(id) {
  const response = await fetch(`${API_BASE_URL}/labels/${id}`, {
    method: 'DELETE',
    headers: { ...getAuthHeader() },
  });

  return await parseJsonResponse(response);
}

// ---------------------------------------------------------------------------
// User Settings API Calls
// ---------------------------------------------------------------------------

export async function fetchSettings() {
  const response = await fetch(`${API_BASE_URL}/settings`, {
    headers: { ...getAuthHeader() },
  });
  const data = await parseJsonResponse(response);
  return data.settings || {};
}

export async function updateSettings(settings) {
  const response = await fetch(`${API_BASE_URL}/settings`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify(settings),
  });

  const data = await parseJsonResponse(response);
  return data.settings;
}

// ---------------------------------------------------------------------------
// Health Check
// ---------------------------------------------------------------------------

export async function checkBackendHealth() {
  const response = await fetch(`${API_BASE_URL}/health`);
  return await parseJsonResponse(response);
}
