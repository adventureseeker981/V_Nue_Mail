use std::io::{BufRead, BufReader};
use std::net::{TcpListener};

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
    recepient: String,
    data_inside: String,
}

fn main() {
    let connection = TcpListener::bind("127.0.0.1:2525").expect("msg1");
    let mut data = EmailData {
        server: String::new(),
        mail_addr: String::new(),
        recepient: String::new(),
        data_inside: String::new(),
    };
    for stream in connection.incoming() {
        let stream = stream.expect("msg");
        println!("{:?}", stream);
        let mut reader = BufReader::new(&stream);
        let mut state = SessionStates::Connected;
        loop {
            let mut line = String::new();
            match reader.read_line(&mut line) {
                Ok(0) => break,
                Ok(_) => {
                    match  state{
                        SessionStates::Exit => break,
                        _ => {state = handle_states(state, &line, &mut data);}
                }
                },
                Err(_) => break,
            };
        }
    }
}

fn handle_states(state: SessionStates, input: &str, data: &mut EmailData) -> SessionStates {
    let vec = vec!["EHLO", "MAIL FROM", "RCPT TO", "DATA", "."];
    if input.trim().to_ascii_lowercase() == "exit"{
        SessionStates::Exit
    }
    else{
    match state {
        SessionStates::Connected => {
            if input.trim().to_ascii_uppercase().starts_with("EHLO") {
                data.server = input.trim().to_ascii_uppercase().replace("EHLO", "");
                SessionStates::Greeted
            } else {
                if vec
                    .iter()
                    .any(|&pattern| input.trim().to_ascii_uppercase().contains(pattern))
                {
                    println!("503 Use 'EHLO' before");
                } else {
                    println!("500 Invalid Command");
                }
                state
            }
        }
        SessionStates::Greeted => {
            if input.trim().to_ascii_uppercase().starts_with("MAIL FROM") {
                data.mail_addr = input.trim().to_ascii_uppercase().replace("MAIL FROM", "");
                SessionStates::AfterMailFrom
            } else {
                if vec
                    .iter()
                    .any(|&pattern| input.trim().to_ascii_uppercase().contains(pattern))
                {
                    println!("503 Use 'Mail From' before");
                } else {
                    println!("500 Invalid Command");
                }
                state
            }
        }
        SessionStates::AfterMailFrom => {
            if input.trim().to_ascii_uppercase().starts_with("RCPT TO") {
                data.recepient = input.trim().to_ascii_uppercase().replace("RCPT TO", "");
                SessionStates::AfterRCPTto
            } else {
                if vec
                    .iter()
                    .any(|&pattern| input.trim().to_ascii_uppercase().contains(pattern))
                {
                    println!("503 Use 'RCPT TO' before");
                } else {
                    println!("500 Invalid Command");
                }
                state
            }
        }
        SessionStates::AfterRCPTto => {
            if input.trim().to_ascii_uppercase().starts_with("RCPT TO") {
                data.recepient = format!(
                    "{} , {}",
                    data.recepient,
                    input.to_ascii_uppercase().replace("RCPT TO", "").trim()
                );
                state
            } else if input.trim().to_ascii_uppercase().starts_with("DATA") {
                println!("354");
                SessionStates::MailDataInput
            } else {
                if vec
                    .iter()
                    .any(|&pattern| input.trim().to_ascii_uppercase().contains(pattern))
                {
                    println!("503 Use 'Mail From' before");
                } else {
                    println!("500 Invalid Command");
                }
                state
            }
        }
        SessionStates::MailDataInput => {
            if input.trim() == "." {
                println!("================={}==================", data.server);
                println!("from: {}", data.mail_addr);
                println!("to: {}", data.recepient);
                println!("========================================");
                print!("{}", data.data_inside);
                println!("========================================");

                data.data_inside.clear();
                SessionStates::Greeted
            } else {
                data.data_inside.push_str(input);
                state
            }
        }
        SessionStates::Exit => {
            SessionStates::Exit
        }
    }
}
}
