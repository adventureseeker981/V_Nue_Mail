// src/services/rustService.js — Bridge between Express backend and teammate's Rust Server
//
// This service fulfills Requirement 5:
// "React Frontend -> Express Backend -> Rust Server"
// Express acts as the bridge:
// 1. Receives and validates data from React.
// 2. Forwards email processing to the Rust server via HTTP.
// 3. Receives Rust response and sends it back to React.
//
// If the Rust server is not running, offline, or returns 404 (e.g. deployed on Vercel
// where background TCP SMTP listeners are not supported), this file provides clear
// error reporting and fallback handling so the application persists emails reliably.

require('dotenv').config();

// Helper to resolve the Rust Server internal base URL dynamically from environment bindings
function getRustServerUrl() {
  const url = process.env.RUST_MAIL_SERVER_URL || process.env.RUST_SERVER_URL;
  if (!url) return null;
  return url.endsWith('/') ? url : `${url}/`;
}

/**
 * Check if the Rust server is alive and responding.
 */
async function checkRustHealth() {
  const baseUrl = getRustServerUrl();
  if (!baseUrl) {
    return {
      online: false,
      configured: false,
      error: 'Rust mail server is not configured (RUST_MAIL_SERVER_URL is unset).',
      message: 'Rust mail server is not deployed or configured yet.',
    };
  }

  const targetUrl = new URL('health', baseUrl);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000); // 2-second timeout

    const response = await fetch(targetUrl, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (response.ok) {
      return { online: true, configured: true, url: baseUrl };
    }
    return {
      online: false,
      configured: true,
      url: baseUrl,
      status: response.status,
      message: `Rust mail server at ${baseUrl} returned HTTP ${response.status}. Rust SMTP servers require persistent TCP listeners (e.g. Render, Railway, Fly.io, or VPS) and cannot run as Vercel serverless HTTP functions.`,
    };
  } catch (error) {
    return {
      online: false,
      configured: true,
      url: baseUrl,
      error: error.message || 'Connection refused',
      message: `Failed to connect to Rust mail server at ${baseUrl}: ${error.message || 'Connection refused'}. Message saved to PostgreSQL database.`,
    };
  }
}

/**
 * Forward outgoing email to the Rust Server for processing.
 *
 * @param {Object} emailData
 * @param {string} emailData.sender - Sender email
 * @param {string} emailData.recipient - Receiver email
 * @param {string} emailData.subject - Subject line
 * @param {string} emailData.body - Message body
 */
async function forwardEmailToRust(emailData) {
  const baseUrl = getRustServerUrl();
  if (!baseUrl) {
    console.log('[Rust Bridge] RUST_MAIL_SERVER_URL is not set. Rust mail server is not deployed yet.');
    return {
      success: false,
      rustAvailable: false,
      message: 'Rust mail server is not configured (RUST_MAIL_SERVER_URL is unset). Message saved to database only.',
    };
  }

  const targetUrl = new URL('api/process-mail', baseUrl);
  console.log(`[Rust Bridge] Forwarding email to Rust server at ${targetUrl}...`);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000); // 3-second timeout

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: emailData.sender,
        recipient: emailData.recipient,
        subject: emailData.subject,
        body: emailData.body,
        timestamp: new Date().toISOString(),
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.warn(`[Rust Bridge Warning] Rust server returned status ${response.status}`);
      return {
        success: false,
        rustAvailable: false,
        statusCode: response.status,
        message: `Rust server at ${baseUrl} returned HTTP ${response.status} (Vercel does not support persistent SMTP sockets). Message saved to database only.`,
      };
    }

    const rustResult = await response.json().catch(() => ({ status: 'accepted' }));
    console.log('[Rust Bridge] Email processed successfully by Rust server.');
    return {
      success: true,
      rustAvailable: true,
      data: rustResult,
    };
  } catch (error) {
    // If Rust is offline, do NOT crash. Report it cleanly.
    console.warn(`[Rust Bridge Warning] Could not reach Rust server: ${error.message}`);
    return {
      success: false,
      rustAvailable: false,
      message: `Rust server at ${baseUrl} is currently unreachable (${error.message}). Message saved to database only.`,
    };
  }
}

module.exports = {
  get RUST_SERVER_URL() {
    return getRustServerUrl();
  },
  getRustServerUrl,
  checkRustHealth,
  forwardEmailToRust,
};
