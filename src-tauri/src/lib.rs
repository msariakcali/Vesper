use std::path::{Path, PathBuf};
use tauri::{ipc::Response, AppHandle, Emitter, Manager};

const LIBRARY_FOLDER: &str = "PDF Editör";

fn library_path(app: &AppHandle) -> Result<PathBuf, String> {
    let documents = app
        .path()
        .document_dir()
        .map_err(|e| format!("Belgeler klasörü bulunamadı: {e}"))?;
    let directory = documents.join(LIBRARY_FOLDER);
    std::fs::create_dir_all(&directory)
        .map_err(|e| format!("{} oluşturulamadı: {e}", directory.display()))?;
    Ok(directory)
}

fn safe_file_name(name: &str) -> Result<&std::ffi::OsStr, String> {
    Path::new(name)
        .file_name()
        .ok_or_else(|| format!("Geçersiz dosya adı: {name}"))
}

/// Diskten ham bayt okur ve IPC üzerinden binary olarak döner.
///
/// `plugin-fs` yalnızca dialog ile seçilen yolları scope'una aldığı için
/// sürükle-bırak ve komut satırı argümanıyla gelen dosyalar oradan okunamaz.
/// Bu komut o boşluğu doldurur. `Response` kullanmak baytların JSON sayı
/// dizisine serileştirilmesini önler — büyük PDF'lerde belirleyici fark.
#[tauri::command]
fn read_file_bytes(path: String) -> Result<Response, String> {
    let bytes = std::fs::read(&path).map_err(|e| format!("{path} okunamadı: {e}"))?;
    Ok(Response::new(bytes))
}

/// Tek bir dosyayı diske yazar.
#[tauri::command]
fn write_file_bytes(path: String, data: Vec<u8>) -> Result<(), String> {
    if let Some(parent) = Path::new(&path).parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("{} oluşturulamadı: {e}", parent.display()))?;
    }
    std::fs::write(&path, data).map_err(|e| format!("{path} yazılamadı: {e}"))
}

#[derive(serde::Deserialize)]
struct OutputFile {
    name: String,
    data: Vec<u8>,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct LibraryFile {
    name: String,
    path: String,
    size: u64,
    modified_at: u64,
}

/// Uygulamanın tüm kalıcı çıktılarının tutulduğu sabit klasör.
#[tauri::command]
fn library_dir(app: AppHandle) -> Result<String, String> {
    Ok(library_path(&app)?.to_string_lossy().into_owned())
}

/// Tek dosyayı kullanıcıya diyalog göstermeden sabit kütüphaneye yazar.
#[tauri::command]
fn write_library_file(app: AppHandle, name: String, data: Vec<u8>) -> Result<String, String> {
    let directory = library_path(&app)?;
    let target = directory.join(safe_file_name(&name)?);
    std::fs::write(&target, data)
        .map_err(|e| format!("{} yazılamadı: {e}", target.display()))?;
    Ok(target.to_string_lossy().into_owned())
}

/// Çoklu çıktıları aynı sabit kütüphaneye yazar.
#[tauri::command]
fn write_library_files(app: AppHandle, files: Vec<OutputFile>) -> Result<Vec<String>, String> {
    let directory = library_path(&app)?;
    let mut written = Vec::with_capacity(files.len());
    for file in files {
        let target = directory.join(safe_file_name(&file.name)?);
        std::fs::write(&target, file.data)
            .map_err(|e| format!("{} yazılamadı: {e}", target.display()))?;
        written.push(target.to_string_lossy().into_owned());
    }
    Ok(written)
}

/// Kütüphanedeki PDF belgelerini en son değişenden başlayarak listeler.
#[tauri::command]
fn list_library_files(app: AppHandle) -> Result<Vec<LibraryFile>, String> {
    let directory = library_path(&app)?;
    let mut files = Vec::new();
    for entry in std::fs::read_dir(&directory)
        .map_err(|e| format!("{} okunamadı: {e}", directory.display()))?
    {
        let entry = entry.map_err(|e| format!("Kütüphane girdisi okunamadı: {e}"))?;
        let path = entry.path();
        if !path.is_file()
            || path.extension().and_then(|ext| ext.to_str()).map(|ext| ext.eq_ignore_ascii_case("pdf")) != Some(true)
        {
            continue;
        }
        let metadata = entry.metadata().map_err(|e| format!("{} okunamadı: {e}", path.display()))?;
        let modified_at = metadata
            .modified()
            .ok()
            .and_then(|time| time.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|duration| duration.as_millis() as u64)
            .unwrap_or(0);
        files.push(LibraryFile {
            name: entry.file_name().to_string_lossy().into_owned(),
            path: path.to_string_lossy().into_owned(),
            size: metadata.len(),
            modified_at,
        });
    }
    files.sort_by(|a, b| b.modified_at.cmp(&a.modified_at));
    Ok(files)
}

#[tauri::command]
fn delete_library_file(app: AppHandle, name: String) -> Result<(), String> {
    let directory = library_path(&app)?;
    let target = directory.join(safe_file_name(&name)?);
    if target.parent() != Some(directory.as_path()) {
        return Err("Geçersiz kütüphane yolu.".into());
    }
    std::fs::remove_file(&target)
        .map_err(|e| format!("{} silinemedi: {e}", target.display()))
}

#[tauri::command]
fn open_library_dir(app: AppHandle) -> Result<(), String> {
    let directory = library_path(&app)?;
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&directory)
            .spawn()
            .map_err(|e| format!("Klasör açılamadı: {e}"))?;
    }
    Ok(())
}

/// Bölme işleminin çıktısı gibi çok sayıda dosyayı tek seferde bir klasöre yazar.
/// Yazılan dosyaların tam yollarını döner.
#[tauri::command]
fn write_files_to_dir(dir: String, files: Vec<OutputFile>) -> Result<Vec<String>, String> {
    let dir_path = PathBuf::from(&dir);
    std::fs::create_dir_all(&dir_path).map_err(|e| format!("{dir} oluşturulamadı: {e}"))?;

    let mut written = Vec::with_capacity(files.len());
    for file in files {
        // Klasör dışına çıkmayı engelle: yalnızca dosya adını kullan.
        let name = Path::new(&file.name)
            .file_name()
            .ok_or_else(|| format!("Geçersiz dosya adı: {}", file.name))?;
        let target = dir_path.join(name);
        std::fs::write(&target, file.data)
            .map_err(|e| format!("{} yazılamadı: {e}", target.display()))?;
        written.push(target.to_string_lossy().into_owned());
    }
    Ok(written)
}

/// Uygulama bir dosyaya çift tıklanarak veya "birlikte aç" ile başlatıldığında
/// komut satırından gelen PDF yollarını döner.
#[tauri::command]
fn startup_files() -> Vec<String> {
    std::env::args()
        .skip(1)
        .filter(|arg| {
            !arg.starts_with('-') && arg.to_lowercase().ends_with(".pdf") && Path::new(arg).is_file()
        })
        .collect()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            let paths: Vec<String> = args
                .into_iter()
                .skip(1)
                .filter(|arg| arg.to_lowercase().ends_with(".pdf"))
                .collect();
            if !paths.is_empty() {
                let _ = app.emit("open-files", paths);
            }
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            read_file_bytes,
            write_file_bytes,
            write_files_to_dir,
            library_dir,
            write_library_file,
            write_library_files,
            list_library_files,
            delete_library_file,
            open_library_dir,
            startup_files
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
