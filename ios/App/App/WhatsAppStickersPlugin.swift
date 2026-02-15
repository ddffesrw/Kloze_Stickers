import Foundation
import Capacitor
import UIKit

@objc(WhatsAppStickersPlugin)
public class WhatsAppStickersPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WhatsAppStickersPlugin"
    public let jsName = "WhatsAppStickers"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isWhatsAppInstalled", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "addStickerPack", returnType: CAPPluginReturnPromise)
    ]

    private let pasteBoardType = "net.whatsapp.third-party.sticker-pack"

    @objc func isWhatsAppInstalled(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let whatsAppInstalled = UIApplication.shared.canOpenURL(URL(string: "whatsapp://")!)
            call.resolve(["installed": whatsAppInstalled])
        }
    }

    @objc func addStickerPack(_ call: CAPPluginCall) {
        guard let identifier = call.getString("identifier"),
              let name = call.getString("name"),
              let publisher = call.getString("publisher"),
              let trayImageBase64 = call.getString("trayImage"),
              let stickersArray = call.getArray("stickers") as? [[String: Any]] else {
            call.reject("Missing required parameters")
            return
        }

        DispatchQueue.main.async {
            // Check if WhatsApp is installed
            guard UIApplication.shared.canOpenURL(URL(string: "whatsapp://")!) else {
                call.reject("WhatsApp is not installed")
                return
            }

            // Create sticker pack dictionary
            var stickerPack: [String: Any] = [
                "identifier": identifier,
                "name": name,
                "publisher": publisher,
                "tray_image": trayImageBase64
            ]

            // Process stickers
            var stickers: [[String: Any]] = []
            for stickerData in stickersArray {
                if let imageData = stickerData["imageData"] as? String {
                    var sticker: [String: Any] = ["image_data": imageData]
                    if let emojis = stickerData["emojis"] as? [String] {
                        sticker["emojis"] = emojis
                    }
                    stickers.append(sticker)
                }
            }

            stickerPack["stickers"] = stickers

            // Convert to JSON
            do {
                let jsonData = try JSONSerialization.data(withJSONObject: stickerPack, options: [])

                // Copy to pasteboard
                let pasteboard = UIPasteboard.general
                pasteboard.setItems([[self.pasteBoardType: jsonData]], options: [
                    .localOnly: true,
                    .expirationDate: Date(timeIntervalSinceNow: 60)
                ])

                // Open WhatsApp
                if let url = URL(string: "whatsapp://stickerPack") {
                    UIApplication.shared.open(url, options: [:]) { success in
                        if success {
                            call.resolve(["success": true])
                        } else {
                            call.reject("Failed to open WhatsApp")
                        }
                    }
                } else {
                    call.reject("Invalid WhatsApp URL")
                }
            } catch {
                call.reject("Failed to create sticker pack: \(error.localizedDescription)")
            }
        }
    }
}
