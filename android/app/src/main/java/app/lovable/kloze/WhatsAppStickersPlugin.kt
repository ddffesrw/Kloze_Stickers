package app.lovable.kloze

import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.util.Base64
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.io.File
import java.io.FileOutputStream

@CapacitorPlugin(name = "WhatsAppStickers")
class WhatsAppStickersPlugin : Plugin() {

    companion object {
        private const val STICKER_PACK_IDENTIFIER_KEY = "sticker_pack_identifier"
        private const val STICKER_PACK_NAME_KEY = "sticker_pack_name"
        private const val STICKER_PACK_PUBLISHER_KEY = "sticker_pack_publisher"
        private const val STICKER_PACK_ICON_KEY = "sticker_pack_icon"
        private const val ANDROID_APP_DOWNLOAD_LINK_KEY = "android_play_store_link"
        private const val IOS_APP_DOWNLOAD_LINK_KEY = "ios_app_download_link"
        private const val PUBLISHER_WEBSITE = "publisher_website"
        private const val PRIVACY_POLICY_WEBSITE = "privacy_policy_website"
        private const val LICENSE_AGREEMENT_WEBSITE = "license_agreement_website"

        private const val EXTRA_STICKER_PACK_ID = "sticker_pack_id"
        private const val EXTRA_STICKER_PACK_AUTHORITY = "sticker_pack_authority"
        private const val EXTRA_STICKER_PACK_NAME = "sticker_pack_name"

        private const val ADD_PACK_REQUEST_CODE = 200
    }

    @PluginMethod
    fun addStickerPack(call: PluginCall) {
        try {
            val identifier = call.getString("identifier")
            val name = call.getString("name")
            val publisher = call.getString("publisher")
            val trayImage = call.getString("trayImage")
            val stickers = call.getArray("stickers")

            // Validasyon
            if (identifier.isNullOrEmpty() || name.isNullOrEmpty() ||
                publisher.isNullOrEmpty() || trayImage.isNullOrEmpty() || stickers == null) {
                call.reject("Eksik parametreler")
                return
            }

            if (stickers.length() < 3 || stickers.length() > 30) {
                call.reject("Sticker sayısı 3-30 arasında olmalıdır")
                return
            }

            // WhatsApp yüklü mü kontrol et
            if (!isWhatsAppInstalled()) {
                call.reject("WhatsApp yüklü değil", "WHATSAPP_NOT_INSTALLED")
                return
            }

            // Temporary dizinde sticker paketini oluştur
            val packDir = File(context.cacheDir, "stickers/$identifier")
            packDir.mkdirs()

            // Tray ikonunu kaydet
            val trayFile = File(packDir, "tray.png")
            saveBase64ToFile(trayImage, trayFile)

            // Sticker'ları kaydet
            val stickerFiles = mutableListOf<File>()
            for (i in 0 until stickers.length()) {
                val stickerObj = stickers.getJSONObject(i)
                val data = stickerObj.getString("data")
                val stickerFile = File(packDir, "sticker_$i.webp")

                if (data.startsWith("data:")) {
                    // Base64 data URL
                    saveBase64ToFile(data, stickerFile)
                } else {
                    // File path
                    val sourceFile = File(data)
                    if (sourceFile.exists()) {
                        sourceFile.copyTo(stickerFile, overwrite = true)
                    }
                }
                stickerFiles.add(stickerFile)
            }

            // Metadata JSON oluştur ve kaydet
            val metadataJson = """
                {
                    "identifier": "$identifier",
                    "name": "$name",
                    "publisher": "$publisher",
                    "publisher_website": "${call.getString("publisherWebsite") ?: ""}",
                    "privacy_policy_website": "${call.getString("privacyPolicyWebsite") ?: ""}",
                    "license_agreement_website": "${call.getString("licenseAgreementWebsite") ?: ""}"
                }
            """.trimIndent()

            File(packDir, "metadata.json").writeText(metadataJson)

            // WhatsApp intent'ini oluştur ve gönder (ContentProvider authority ile)
            val intent = Intent().apply {
                action = "com.whatsapp.intent.action.ENABLE_STICKER_PACK"
                putExtra(EXTRA_STICKER_PACK_ID, identifier)
                putExtra(EXTRA_STICKER_PACK_AUTHORITY, "${context.packageName}.stickercontentprovider")
                putExtra(EXTRA_STICKER_PACK_NAME, name)
            }

            try {
                context.startActivity(intent)

                val ret = JSObject()
                ret.put("success", true)
                ret.put("message", "Sticker paketi WhatsApp'a gönderildi")
                call.resolve(ret)

            } catch (e: ActivityNotFoundException) {
                call.reject("WhatsApp uygulaması bulunamadı", "WHATSAPP_NOT_FOUND", e)
            }

        } catch (e: Exception) {
            call.reject("Sticker paketi oluşturulurken hata: ${e.message}", e)
        }
    }

    @PluginMethod
    fun isWhatsAppInstalled(call: PluginCall): Boolean {
        val installed = isWhatsAppInstalled()
        val ret = JSObject()
        ret.put("installed", installed)
        call.resolve(ret)
        return installed
    }

    private fun isWhatsAppInstalled(): Boolean {
        val pm = context.packageManager
        return try {
            pm.getPackageInfo("com.whatsapp", 0)
            true
        } catch (e: Exception) {
            false
        }
    }

    private fun saveBase64ToFile(base64Data: String, file: File) {
        // "data:image/png;base64," veya benzeri prefix'i kaldır
        val base64 = if (base64Data.contains(",")) {
            base64Data.split(",")[1]
        } else {
            base64Data
        }

        val bytes = Base64.decode(base64, Base64.DEFAULT)
        FileOutputStream(file).use { it.write(bytes) }
    }
}
