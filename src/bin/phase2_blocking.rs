// Phase 2: Blocking, single-connection SMTP server
//
// This is intentionally simple and limited. It uses only the Rust standard
// library — no Tokio, no async, no threads. It handles ONE client at a time.
//
// While one client is in a session, any other client that connects must WAIT
// at the TCP accept() call. This is the problem Phase 3 (tokio) solves.
//
// Run with:  cargo run --bin phase2_blocking
// Server listens on 127.0.0.1:2526

use std::io::{BufRead, BufReader, Write};
use std::net::{TcpListener, TcpStream};

// --- SMTP state machine (same logic as main.rs, but fully synchronous) ------

#[derive(Debug)]
enum State {
    Connected,
    Greeted,
    AfterMailFrom,
    AfterRcptTo,
    InData,
    Done,
}

struct Session {
    state: State,
    sender: String,
    recipients: Vec<String>,
    body: String,
}

impl Session {
    fn new() -> Self {
        Session {
            state: State::Connected,
            sender: String::new(),
            recipients: Vec::new(),
            body: String::new(),
        }
    }
}

// Extract the email address from angle brackets: <addr@example.com> -> addr@example.com
fn extract_email(line: &str) -> String {
    if let Some(start) = line.find('<') {
        if let Some(end) = line.find('>') {
            return line[start + 1..end].to_string();
        }
    }
    // fallback: take everything after the first colon
    line.split(':').nth(1).unwrap_or("").trim().to_string()
}

// --- Handle a single client connection (blocking) ---------------------------
//
// This function owns the TcpStream for the entire session.
// main() cannot do anything else until this returns.

fn handle_client(stream: TcpStream) {
    let peer = stream.peer_addr().unwrap();
    println!("[phase2] Connection from {}", peer);

    // BufReader wraps the stream for line-by-line reading
    let mut reader = BufReader::new(stream.try_clone().expect("clone stream"));
    let mut writer = stream;

    let mut session = Session::new();

    // Send the SMTP greeting banner
    write!(writer, "220 V_Nue Mail Phase2 SMTP Server Ready\r\n").unwrap();
    writer.flush().unwrap();

    // --- Command loop --------------------------------------------------------
    // read_line() BLOCKS here until the client sends a line.
    // The whole program is stuck in this loop — no other client can be served.

    loop {
        let mut line = String::new();

        match reader.read_line(&mut line) {
            Ok(0) => {
                // Client closed the connection
                println!("[phase2] {} disconnected", peer);
                break;
            }
            Err(e) => {
                eprintln!("[phase2] Read error from {}: {}", peer, e);
                break;
            }
            Ok(_) => {}
        }

        let trimmed = line.trim();
        println!("[phase2] {} >>> {}", peer, trimmed);

        let response = process_command(&mut session, trimmed);

        if !response.is_empty() {
            println!("[phase2] {} <<< {}", peer, response.trim());
            write!(writer, "{}", response).unwrap();
            writer.flush().unwrap();
        }

        // If we sent 221 Bye, end the loop
        if matches!(session.state, State::Done) {
            break;
        }
    }

    println!("[phase2] Session with {} ended\n", peer);
}

fn process_command(session: &mut Session, input: &str) -> String {
    let upper = input.to_ascii_uppercase();

    if upper == "QUIT" {
        session.state = State::Done;
        return "221 Bye\r\n".to_string();
    }

    match session.state {
        State::Connected => {
            if upper.starts_with("EHLO") || upper.starts_with("HELO") {
                session.state = State::Greeted;
                "250 Hello\r\n".to_string()
            } else {
                "503 Send EHLO first\r\n".to_string()
            }
        }

        State::Greeted => {
            if upper.starts_with("MAIL FROM") {
                session.sender = extract_email(input);
                session.state = State::AfterMailFrom;
                "250 OK\r\n".to_string()
            } else {
                "503 Send MAIL FROM next\r\n".to_string()
            }
        }

        State::AfterMailFrom => {
            if upper.starts_with("RCPT TO") {
                session.recipients.push(extract_email(input));
                session.state = State::AfterRcptTo;
                "250 OK\r\n".to_string()
            } else {
                "503 Send RCPT TO next\r\n".to_string()
            }
        }

        State::AfterRcptTo => {
            if upper.starts_with("RCPT TO") {
                session.recipients.push(extract_email(input));
                "250 OK\r\n".to_string()
            } else if upper == "DATA" {
                session.state = State::InData;
                "354 End data with a lone dot (.)\r\n".to_string()
            } else {
                "503 Send RCPT TO or DATA\r\n".to_string()
            }
        }

        State::InData => {
            if input == "." {
                // Message complete — just print it (no DB in Phase 2)
                println!(
                    "[phase2] Message received: {} -> {:?}",
                    session.sender, session.recipients
                );
                println!("[phase2] Body:\n---\n{}\n---", session.body);
                session.state = State::Greeted; // ready for another message
                "250 Message accepted (printed to stdout — no DB in Phase 2)\r\n".to_string()
            } else {
                session.body.push_str(input);
                session.body.push('\n');
                String::new() // no response during DATA
            }
        }

        State::Done => String::new(),
    }
}

// --- Main: the blocking accept loop -----------------------------------------
//
// KEY INSIGHT: handle_client() is called directly in the loop — there is no
// thread::spawn, no tokio::spawn. The loop cannot call listener.accept() again
// until handle_client() returns, which only happens when the client QUITs.
//
// Open two terminals and connect simultaneously to see this limitation.

fn main() {
    let addr = "127.0.0.1:2526";
    let listener = TcpListener::bind(addr).expect("Failed to bind to port 2526");

    println!("╔══════════════════════════════════════════════════╗");
    println!("║  Phase 2: Blocking SMTP Server on port 2526      ║");
    println!("║  Handles ONE client at a time (no threading)     ║");
    println!("║                                                   ║");
    println!("║  Test: open two terminals, run nc 127.0.0.1 2526 ║");
    println!("║  The second terminal will hang until the first   ║");
    println!("║  client sends QUIT. That is the problem Phase 3  ║");
    println!("║  (tokio) solves with async tasks.                ║");
    println!("╚══════════════════════════════════════════════════╝");
    println!();

    // accept() blocks until a client connects, then returns the stream.
    // We immediately hand it to handle_client() — synchronously, on this thread.
    // The next accept() doesn't run until handle_client() returns.
    for incoming in listener.incoming() {
        match incoming {
            Ok(stream) => handle_client(stream),
            Err(e) => eprintln!("Accept error: {}", e),
        }
    }
}
