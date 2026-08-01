// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder},
    Manager,
};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn show_window(window: tauri::WebviewWindow, label: &str) {
    if let Some(w) = window.get_webview_window(label) {
        let _ = w.show();
        let _ = w.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_positioner::init())
        .invoke_handler(tauri::generate_handler![greet, show_window])
        .setup(|app| {
            let quit_i = MenuItem::with_id(app, "quit", "Выход", true, None::<&str>)?;
            let new_post_i = MenuItem::with_id(app, "new-post", "Новый пост", true, None::<&str>)?;
            let open_omega_i = MenuItem::with_id(app, "open-omega", "Открыть OMEGA", true, None::<&str>)?;
            let emergency_i = MenuItem::with_id(app, "emergency-stop", "Emergency Stop", true, None::<&str>)?;
            let menu = Menu::with_items(
                app,
                &[&new_post_i, &open_omega_i, &emergency_i, &quit_i],
            )?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().cloned().unwrap_or_default())
                .menu(&menu)
                .menu_on_left_click(true)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    "open-omega" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                            let _ = window.eval("window.location.href = '/ai-chat';");
                        }
                    }
                    "new-post" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                            let _ = window.eval("window.location.href = '/scheduler';");
                        }
                    }
                    "emergency-stop" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.eval("localStorage.setItem('omegaEmergencyStop','true'); window.location.reload();");
                        }
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let MouseButtonState::Down = event.button_state {
                        if event.button == MouseButton::Left {
                            let app = tray.app_handle();
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
