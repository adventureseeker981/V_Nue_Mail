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

// The port and host where your teammate's Rust HTTP server runs
const RUST_SERVER_URL = process.env.RUST_SERVER_URL || 'http://127.0.0.1:8080';

/**
 * Check if the Rust server is alive and responding.
 */
async function checkRustHealth() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000); // 2-second timeout

    const response = await fetch(`${RUST_SERVER_URL}/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (response.ok) {
      return { online: true, url: RUST_SERVER_URL };
    }
    return { online: false, url: RUST_SERVER_URL, status: response.status };
  } catch (error) {
    return {
      online: false,
      url: RUST_SERVER_URL,
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
  console.log(`[Rust Bridge] Forwarding email to Rust server at ${RUST_SERVER_URL}/api/process-mail...`);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000); // 3-second timeout

    const response = await fetch(`${RUST_SERVER_URL}/api/process-mail`, {
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
      message: `Rust server at ${RUST_SERVER_URL} is currently unreachable (${error.message}).`,
    };
  }
}

module.exports = {
  RUST_SERVER_URL,
  checkRustHealth,
  forwardEmailToRust,
};

