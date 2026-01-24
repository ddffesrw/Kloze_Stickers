import Foundation
import Capacitor

/**
 * WhatsApp Stickers Plugin for iOS
 * WhatsApp'a sticker paketi ekleme
 */
@objc(WhatsAppStickersPlugin)
public class WhatsAppStickersPlugin: CAPPlugin {

    @objc func addStickerPack(_ call: CAPPluginCall) {
        guard let identifier = call.getString("identifier"),
              let name = call.getString("name"),
              let publisher = call.getString("publisher"),
              let trayImage = call.getString("trayImage"),
              let stickers = call.getArray("stickers", JSObject.self) else {
            call.reject("Eksik parametreler")
            return
        }

        // Validasyon
        if stickers.count < 3 || stickers.count > 30 {
            call.reject("Sticker sayısı 3-30 arasında olmalıdır")
            return
        }

        // WhatsApp yüklü mü kontrol et
        guard isWhatsAppInstalled() else {
            call.reject("WhatsApp yüklü değil", "WHATSAPP_NOT_INSTALLED")
            return
        }

        do {
            // Temporary dizinde paket oluştur
            let tempDir = FileManager.default.temporaryDirectory
            let packDir = tempDir.appendingPathComponent("stickers/\(identifier)")

            try FileManager.default.createDirectory(at: packDir, withIntermediateDirectories: true)

            // Tray ikonunu kaydet
            let trayFile = packDir.appendingPathComponent("tray.png")
            try saveBase64ToFile(base64: trayImage, url: trayFile)

            // Sticker'ları kaydet
            for (index, stickerObj) in stickers.enumerated() {
                guard let data = stickerObj["data"] as? String else { continue }

                let stickerFile = packDir.appendingPathComponent("sticker_\(index).webp")

                if data.hasPrefix("data:") {
                    try saveBase64ToFile(base64: data, url: stickerFile)
                } else {
                    // File path
                    let sourceURL = URL(fileURLWithPath: data)
                    if FileManager.default.fileExists(atPath: sourceURL.path) {
                        try FileManager.default.copyItem(at: sourceURL, to: stickerFile)
                    }
                }
            }

            // WhatsApp URL scheme ile aç
            // whatsapp://stickerPack?identifier=...
            let urlString = "whatsapp://stickerPack?identifier=\(identifier)&name=\(name.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? name)"

            if let url = URL(string: urlString) {
                DispatchQueue.main.async {
                    if UIApplication.shared.canOpenURL(url) {
                        UIApplication.shared.open(url) { success in
                            if success {
                                call.resolve([
                                    "success": true,
                                    "message": "Sticker paketi WhatsApp'a gönderildi"
                                ])
                            } else {
                                call.reject("WhatsApp açılamadı", "WHATSAPP_OPEN_FAILED")
                            }
                        }
                    } else {
                        call.reject("WhatsApp URL scheme desteklenmiyor", "WHATSAPP_URL_FAILED")
                    }
                }
            } else {
                call.reject("Geçersiz URL", "INVALID_URL")
            }

        } catch {
            call.reject("Sticker paketi oluşturulurken hata: \(error.localizedDescription)")
        }
    }

    @objc func isWhatsAppInstalled(_ call: CAPPluginCall) {
        let installed = isWhatsAppInstalled()
        call.resolve([
            "installed": installed
        ])
    }

    // MARK: - Helper Methods

    private func isWhatsAppInstalled() -> Bool {
        if let url = URL(string: "whatsapp://") {
            return UIApplication.shared.canOpenURL(url)
        }
        return false
    }

    private func saveBase64ToFile(base64: String, url: URL) throws {
        // "data:image/png;base64," prefix'ini kaldır
        let base64String: String
        if base64.contains(",") {
            base64String = base64.components(separatedBy: ",")[1]
        } else {
            base64String = base64
        }

        guard let data = Data(base64Encoded: base64String) else {
            throw NSError(domain: "WhatsAppStickers", code: -1, userInfo: [
                NSLocalizedDescriptionKey: "Base64 decode hatası"
            ])
        }

        try data.write(to: url)
    }
}
