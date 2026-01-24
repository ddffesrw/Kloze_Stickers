import Foundation
import Capacitor
import UIKit

/**
 * WhatsApp Stickers Plugin for iOS (Pasteboard Method)
 * UIPasteboard ile WhatsApp'a sticker paketi gönderme
 *
 * NOT: Bu gelişmiş versiyon. Basit URL scheme yöntemi WhatsAppStickersPlugin.swift içinde.
 */
@objc(WhatsAppStickersPasteboardPlugin)
public class WhatsAppStickersPasteboardPlugin: CAPPlugin {

    @objc func addStickerPackViaPasteboard(_ call: CAPPluginCall) {
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
            var stickerFiles: [URL] = []
            for (index, stickerObj) in stickers.enumerated() {
                guard let data = stickerObj["data"] as? String else { continue }
                let stickerFile = packDir.appendingPathComponent("sticker_\(index).webp")

                if data.hasPrefix("data:") {
                    try saveBase64ToFile(base64: data, url: stickerFile)
                } else {
                    let sourceURL = URL(fileURLWithPath: data)
                    if FileManager.default.fileExists(atPath: sourceURL.path) {
                        try FileManager.default.copyItem(at: sourceURL, to: stickerFile)
                    }
                }
                stickerFiles.append(stickerFile)
            }

            // Metadata oluştur
            let metadata: [String: Any] = [
                "identifier": identifier,
                "name": name,
                "publisher": publisher,
                "tray_image_file": "tray.png",
                "publisher_website": call.getString("publisherWebsite") ?? "",
                "privacy_policy_website": call.getString("privacyPolicyWebsite") ?? "",
                "license_agreement_website": call.getString("licenseAgreementWebsite") ?? "",
                "sticker_count": stickers.count
            ]

            // Pasteboard'a kopyala
            DispatchQueue.main.async {
                self.copyToWhatsAppPasteboard(
                    metadata: metadata,
                    trayFile: trayFile,
                    stickerFiles: stickerFiles,
                    completion: { success, error in
                        if success {
                            // WhatsApp'ı aç
                            if let whatsappURL = URL(string: "whatsapp://app") {
                                UIApplication.shared.open(whatsappURL) { opened in
                                    if opened {
                                        call.resolve([
                                            "success": true,
                                            "message": "Sticker paketi WhatsApp'a kopyalandı"
                                        ])
                                    } else {
                                        call.reject("WhatsApp açılamadı", "WHATSAPP_OPEN_FAILED")
                                    }
                                }
                            }
                        } else {
                            call.reject(error ?? "Pasteboard kopyalama hatası")
                        }
                    }
                )
            }

        } catch {
            call.reject("Sticker paketi oluşturulurken hata: \(error.localizedDescription)")
        }
    }

    // MARK: - Pasteboard Operations

    private func copyToWhatsAppPasteboard(
        metadata: [String: Any],
        trayFile: URL,
        stickerFiles: [URL],
        completion: @escaping (Bool, String?) -> Void
    ) {
        let pasteboard = UIPasteboard.general

        do {
            var items: [[String: Any]] = []

            // 1. Metadata
            let metadataData = try JSONSerialization.data(withJSONObject: metadata, options: [])
            items.append([
                "com.whatsapp.third_party.sticker.metadata": metadataData,
                "public.json": metadataData  // Fallback
            ])

            // 2. Tray Icon
            if let trayData = try? Data(contentsOf: trayFile) {
                items.append([
                    "com.whatsapp.third_party.sticker.tray": trayData,
                    "public.png": trayData  // Fallback
                ])
            }

            // 3. Sticker Images
            for stickerFile in stickerFiles {
                if let stickerData = try? Data(contentsOf: stickerFile) {
                    items.append([
                        "com.whatsapp.third_party.sticker.pack.item": stickerData,
                        "public.data": stickerData  // Fallback
                    ])
                }
            }

            // Pasteboard'a kopyala
            pasteboard.items = items
            pasteboard.setItems(items, options: [.expirationDate: Date().addingTimeInterval(300)])  // 5 dakika

            completion(true, nil)

        } catch {
            completion(false, "Pasteboard kopyalama hatası: \(error.localizedDescription)")
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
