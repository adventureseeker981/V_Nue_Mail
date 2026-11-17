// src/services/rustService.js — Bridge between Express backend and teammate's Rust Server
//
// This service fulfills Requirement 5:
// "React Frontend -> Express Backend -> Rust Server"
// Express acts as the bridge:
// 1. Receives and validates data from React.
// 2. Forwards email processing to the Rust server via HTTP.
// 3. Receives Rust response and sends it back to React.
//
// If the Rust server is not running or offline, this file provides clear
// error reporting and fallback handling so the application does not crash.

require('dotenv').config();

// Helper to resolve the Rust Server internal base URL dynamically from environment bindings
function getRustServerUrl() {
  const url = process.env.RUST_SERVER_URL || 'http://127.0.0.1:8080';
  return url.endsWith('/') ? url : `${url}/`;
}

/**
 * Check if the Rust server is alive and responding.
 */
async function checkRustHealth() {
  const baseUrl = getRustServerUrl();
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
      return { online: true, url: baseUrl };
    }
    return { online: false, url: baseUrl, status: response.status };
  } catch (error) {
    return {
      online: false,
      url: baseUrl,
      error: error.message || 'Connection refused',
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
      throw new Error(`Rust server returned status ${response.status}`);
    }

    const rustResult = await response.json().catch(() => ({ status: 'accepted' }));
    console.log('[Rust Bridge] Email processed successfully by Rust server.');
    return {
      success: true,
      data: rustResult,
    };
  } catch (error) {
    // If Rust is offline, do NOT crash. Report it cleanly.
    console.warn(`[Rust Bridge Warning] Could not reach Rust server: ${error.message}`);
    return {
      success: false,
      rustAvailable: false,
      message: `Rust server at ${baseUrl} is currently unreachable (${error.message}).`,
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

