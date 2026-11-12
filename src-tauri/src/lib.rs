use std::net::TcpStream;
use std::path::PathBuf;
use std::process::{Child, Command};
use std::sync::Mutex;
use tauri::Manager;

struct ServerState(Mutex<Option<Child>>);

fn find_server_script() -> Option<(PathBuf, PathBuf)> {
    let mut check_dirs = Vec::new();

    if let Ok(cur) = std::env::current_dir() {
        check_dirs.push(cur.clone());
        if let Some(parent) = cur.parent() {
            check_dirs.push(parent.to_path_buf());
        }
    }

    if let Ok(exe) = std::env::current_exe() {
        if let Some(parent) = exe.parent() {
            check_dirs.push(parent.to_path_buf());
            if let Some(grandparent) = parent.parent() {
                check_dirs.push(grandparent.to_path_buf());
            }
        }
    }

    for dir in check_dirs {
        let script = dir.join("server").join("index.js");
        if script.exists() {
            return Some((script, dir));
        }
    }

    None
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(ServerState(Mutex::new(None)))
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Cek apakah server lokal di port 3333 sudah aktif
            let server_already_running = TcpStream::connect("127.0.0.1:3333").is_ok();

            if !server_already_running {
                if let Some((script_path, root_dir)) = find_server_script() {
                    #[cfg(target_os = "windows")]
                    {
                        use std::os::windows::process::CommandExt;
                        const CREATE_NO_WINDOW: u32 = 0x08000000;

                        let mut cmd = Command::new("node");
                        cmd.arg(&script_path);
                        cmd.current_dir(&root_dir);
                        cmd.creation_flags(CREATE_NO_WINDOW);

                        match cmd.spawn() {
                            Ok(child) => {
                                println!("[Vexora Rust] Background server otomatis aktif di port 3333.");
                                let state = app.state::<ServerState>();
                                if let Ok(mut lock) = state.0.lock() {
                                    *lock = Some(child);
                                }
                            }
                            Err(err) => {
                                eprintln!("[Vexora Rust] Info: Gagal menjalankan node: {err}");
                            }
                        }
                    }
                }
            } else {
                println!("[Vexora Rust] Server port 3333 sudah aktif, menggunakan koneksi yang ada.");
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                let state = window.state::<ServerState>();
                if let Ok(mut lock) = state.0.lock() {
                    if let Some(mut child) = lock.take() {
                        let _ = child.kill();
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}
