use tokio::net::{TcpListener, TcpStream};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio_postgres::{NoTls, Error};
use uuid::Uuid;
use chrono::Utc;
use regex::Regex;

#[derive(Debug)]
enum SessionStates {
    Connected,
    Greeted,
    AfterMailFrom,
    AfterRCPTto,
    MailDataInput,
    Exit,
}

struct EmailData {
    server: String,
    mail_addr: String,
    recipients: Vec<String>,
    data_inside: String,
}

impl EmailData {
    fn new() -> Self {
        EmailData {
            server: String::new(),
            mail_addr: String::new(),
            recipients: Vec::new(),
            data_inside: String::new(),
        }
    }

    fn clear(&mut self) {
        self.server.clear();
        self.mail_addr.clear();
        self.recipients.clear();
        self.data_inside.clear();
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Database connection
    let db_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "host=localhost user=postgres password=postgres dbname=v_nue_mail".to_string());
    
    let (client, connection) = tokio_postgres::connect(&db_url, NoTls).await?;
    
    tokio::spawn(async move {
        if let Err(e) = connection.await {
            eprintln!("Database connection error: {}", e);
        }
    });

    println!("Connected to database");
    
    // Create tables if they don't exist
    create_tables(&client).await?;
    
    let listener = TcpListener::bind("127.0.0.1:2525").await?;
    println!("SMTP server listening on 127.0.0.1:2525");

    loop {
        let (stream, addr) = listener.accept().await?;
        println!("New connection from: {}", addr);
        
        let client = client.clone();
        tokio::spawn(async move {
            if let Err(e) = handle_client(stream, client).await {
                eprintln!("Error handling client {}: {}", addr, e);
            }
        });
    }
}

async fn create_tables(client: &tokio_postgres::Client) -> Result<(), Error> {
    client.execute(
        "CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            display_name TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )",
        &[],
    ).await?;

    client.execute(
        "CREATE TABLE IF NOT EXISTS messages (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            sender TEXT NOT NULL,
            recipient TEXT NOT NULL,
            subject TEXT,
            body TEXT,
            raw_headers TEXT,
            status TEXT DEFAULT 'unread',
            created_at TIMESTAMPTZ DEFAULT NOW()
        )",
        &[],
    ).await?;

    println!("Tables created successfully");
    Ok(())
}

async fn handle_client(
    mut stream: TcpStream,
    client: tokio_postgres::Client,
) -> Result<(), Box<dyn std::error::Error>> {
    let (reader, mut writer) = stream.split();
    let mut reader = BufReader::new(reader);
    
    // Send welcome message
    writer.write_all(b"220 V_Nue Mail SMTP Server Ready\r\n").await?;
    
    let mut state = SessionStates::Connected;
    let mut data = EmailData::new();
    
    loop {
        let mut line = String::new();
        match reader.read_line(&mut line).await {
            Ok(0) => break,
            Ok(_) => {
                let response = match state {
                    SessionStates::Exit => break,
                    _ => handle_states(&mut state, &line, &mut data, &client).await,
                };
                
                writer.write_all(response.as_bytes()).await?;
                writer.flush().await?;
            }
            Err(_) => break,
        }
    }
    
    Ok(())
}

async fn handle_states(
    state: &mut SessionStates,
    input: &str,
    data: &mut EmailData,
    client: &tokio_postgres::Client,
) -> String {
    if input.trim().to_ascii_lowercase() == "quit" {
        *state = SessionStates::Exit;
        return "221 Bye\r\n".to_string();
    }

    match state {
        SessionStates::Connected => {
            if input.trim().to_ascii_uppercase().starts_with("EHLO") {
                data.server = input.trim()[4..].trim().to_string();
                *state = SessionStates::Greeted;
                "250 Hello\r\n".to_string()
            } else {
                "503 Use 'EHLO' first\r\n".to_string()
            }
        }
        SessionStates::Greeted => {
            if input.trim().to_ascii_uppercase().starts_with("MAIL FROM") {
                data.mail_addr = extract_email(input);
                *state = SessionStates::AfterMailFrom;
                "250 OK\r\n".to_string()
            } else {
                "503 Use 'MAIL FROM' next\r\n".to_string()
            }
        }
        SessionStates::AfterMailFrom => {
            if input.trim().to_ascii_uppercase().starts_with("RCPT TO") {
                let recipient = extract_email(input);
                data.recipients.push(recipient);
                *state = SessionStates::AfterRCPTto;
                "250 OK\r\n".to_string()
            } else {
                "503 Use 'RCPT TO' next\r\n".to_string()
            }
        }
        SessionStates::AfterRCPTto => {
            if input.trim().to_ascii_uppercase().starts_with("RCPT TO") {
                let recipient = extract_email(input);
                data.recipients.push(recipient);
                "250 OK\r\n".to_string()
            } else if input.trim().to_ascii_uppercase().starts_with("DATA") {
                *state = SessionStates::MailDataInput;
                "354 End data with <CR><LF>.<CR><LF>\r\n".to_string()
            } else {
                "503 Use 'RCPT TO' or 'DATA'\r\n".to_string()
            }
        }
        SessionStates::MailDataInput => {
            if input.trim() == "." {
                // Parse and save to database
                let (subject, body, raw_headers) = parse_message(&data.data_inside);
                
                for recipient in &data.recipients {
                    match save_message(
                        client,
                        &data.mail_addr,
                        recipient,
                        &subject,
                        &body,
                        &raw_headers,
                    ).await {
                        Ok(_) => println!("Message saved: {} -> {}", data.mail_addr, recipient),
                        Err(e) => eprintln!("Error saving message: {}", e),
                    }
                }
                
                data.clear();
                *state = SessionStates::Greeted;
                "250 Message accepted\r\n".to_string()
            } else {
                data.data_inside.push_str(input);
                String::new()
            }
        }
        SessionStates::Exit => String::new(),
    }
}

fn extract_email(input: &str) -> String {
    let re = Regex::new(r"<([^>]+)>").unwrap();
    if let Some(caps) = re.captures(input) {
        caps[1].to_string()
    } else {
        input.split(':').nth(1)
            .unwrap_or("")
            .trim()
            .to_string()
    }
}

fn parse_message(raw: &str) -> (String, String, String) {
    let parts: Vec<&str> = raw.splitn(2, "\r\n\r\n").collect();
    
    let headers = parts.get(0).unwrap_or(&"").to_string();
    let body = parts.get(1).unwrap_or(&"").to_string();
    
    let subject = headers
        .lines()
        .find(|line| line.to_ascii_lowercase().starts_with("subject:"))
        .map(|line| line[8..].trim().to_string())
        .unwrap_or_else(|| "(No Subject)".to_string());
    
    (subject, body, headers)
}

async fn save_message(
    client: &tokio_postgres::Client,
    sender: &str,
    recipient: &str,
    subject: &str,
    body: &str,
    raw_headers: &str,
) -> Result<(), Error> {
    client.execute(
        "INSERT INTO messages (id, sender, recipient, subject, body, raw_headers, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
        &[
            &Uuid::new_v4(),
            &sender,
            &recipient,
            &subject,
            &body,
            &raw_headers,
            &"unread",
            &Utc::now(),
        ],
    ).await?;
    
    Ok(())
}
