// TreeWorld desktop shell — Tauri (system WebView) replacement for the
// Electron shell. Frontend is a pure web app (React + Vite, no shell API
// usage), so this Rust binary only provides: window, tray icon with
// show/quit menu, close-to-tray, and a global Ctrl+Shift+T shortcut.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, TrayIconBuilder, TrayIconEvent},
    Manager, WindowEvent,
};

fn show_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_shortcuts(["ctrl+shift+t"])
                .expect("failed to register global shortcut")
                .with_handler(|app, _shortcut, _event| {
                    show_main_window(app);
                })
                .build(),
        )
        .setup(|app| {
            let show_item = MenuItem::with_id(app, "show", "Show TreeWorld", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

            let _tray = TrayIconBuilder::with_id("treeworld-tray")
                .icon(
                    app.default_window_icon()
                        .expect("missing default window icon")
                        .clone(),
                )
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => show_main_window(app),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        ..
                    } = event
                    {
                        show_main_window(tray.app_handle());
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            // Close button hides to tray; real quit is via tray menu or Ctrl+Q.
            if let WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running TreeWorld");
}
