package com.klozestickers.app

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Paint
import android.net.Uri
import android.util.Base64
import android.util.Log
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.io.File
import java.io.FileOutputStream
import java.io.ByteArrayOutputStream

@CapacitorPlugin(name = "WhatsAppStickers")
class WhatsAppStickersPlugin : Plugin() {

    companion object {
        private const val TAG = "WhatsAppStickers"

        private const val EXTRA_STICKER_PACK_ID = "sticker_pack_id"
        private const val EXTRA_STICKER_PACK_AUTHORITY = "sticker_pack_authority"
        private const val EXTRA_STICKER_PACK_NAME = "sticker_pack_name"

        private const val WHATSAPP_PACKAGE = "com.whatsapp"
        private const val WHATSAPP_STICKER_ACTION = "com.whatsapp.intent.action.ENABLE_STICKER_PACK"
        private const val ADD_PACK_REQUEST_CODE = 200

        private const val TRAY_SIZE = 96
        private const val STICKER_SIZE = 512
        private const val MAX_STICKER_SIZE_BYTES = 100 * 1024 // 100 KB
        private const val MAX_TRAY_SIZE_BYTES = 50 * 1024 // 50 KB
    }

    /**
     * Sticker dosyalarının saklandığı dizin.
     * filesDir kullanılır, cacheDir değil - cacheDir sistem tarafından silinebilir.
     */
    private fun getStickersDir(): File {
        return File(context.filesDir, "stickers")
    }

    @PluginMethod
    fun addStickerPack(call: PluginCall) {
        try {
            val identifier = call.getString("identifier")
            val name = call.getString("name")
            val publisher = call.getString("publisher")
            val trayImage = call.getString("trayImage")
            val stickers = call.getArray("stickers")

            Log.d(TAG, "addStickerPack called: identifier=$identifier, name=$name")

            if (identifier.isNullOrEmpty() || name.isNullOrEmpty() ||
                publisher.isNullOrEmpty() || trayImage.isNullOrEmpty() || stickers == null) {
                call.reject("Eksik parametreler")
                return
            }

            val waPackage = getWhatsAppPackage(context)
            if (waPackage == null) {
                call.reject("WhatsApp yüklü değil", "WHATSAPP_NOT_INSTALLED")
                return
            }

            if (!isWhatsAppVersionSupported(waPackage)) {
                call.reject("WhatsApp sürümü çok eski. Lütfen güncelleyin.", "WHATSAPP_VERSION_OLD")
                return
            }

            Thread {
                try {
                    Log.d(TAG, "Starting sticker pack processing in background thread...")

                    val stickerCount = stickers.length()
                    Log.d(TAG, "Sticker count: $stickerCount")

                    if (stickerCount < 3 || stickerCount > 30) {
                        call.reject("Sticker sayısı 3-30 arasında olmalıdır")
                        return@Thread
                    }

                    Log.d(TAG, "Targeting WhatsApp package: $waPackage")

                    // Create Sticker Directory (filesDir - not cacheDir)
                    val packDir = File(getStickersDir(), identifier)
                    if (packDir.exists()) {
                        packDir.deleteRecursively()
                    }
                    packDir.mkdirs()
                    packDir.setReadable(true, false)
                    packDir.setExecutable(true, false)

                    Log.d(TAG, "Pack directory created: ${packDir.absolutePath}")

                    // Process Tray Icon (96x96, < 50KB, PNG)
                    val trayFile = File(packDir, "tray.png")
                    try {
                        processImage(trayImage, trayFile, TRAY_SIZE, MAX_TRAY_SIZE_BYTES.toLong(), Bitmap.CompressFormat.PNG)
                    } catch (e: Exception) {
                        Log.e(TAG, "Error processing tray image", e)
                        call.reject("Tray ikon hatası: ${e.message}")
                        return@Thread
                    }
                    trayFile.setReadable(true, false)

                    // Validate/Process Stickers & Collect Metadata
                    val stickerMetadataList = org.json.JSONArray()
                    var anyAnimated = false
                    var allAnimated = true

                    for (i in 0 until stickerCount) {
                        val stickerObj = stickers.getJSONObject(i)
                        val data = stickerObj.getString("data")
                        val emojis = stickerObj.optJSONArray("emojis")
                        val stickerFilename = "sticker_$i.webp"
                        val stickerFile = File(packDir, stickerFilename)

                        // Collect Metadata
                        val stickerMeta = org.json.JSONObject()
                        stickerMeta.put("image_file", stickerFilename)
                        stickerMeta.put("emojis", emojis ?: org.json.JSONArray().put("😀").put("😊"))
                        stickerMetadataList.put(stickerMeta)

                        try {
                            val byteArray = decodeInputData(data)
                            val isStickerAnimated = isWebPAnimated(byteArray)

                            if (isStickerAnimated) {
                                anyAnimated = true
                                saveAnimatedSticker(byteArray, stickerFile, 500 * 1024L)
                                Log.d(TAG, "Sticker $i is Animated. Saved directly.")
                            } else {
                                allAnimated = false
                                val webpFormat = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
                                    Bitmap.CompressFormat.WEBP_LOSSY
                                } else {
                                    Bitmap.CompressFormat.WEBP
                                }
                                processImage(data, stickerFile, STICKER_SIZE, MAX_STICKER_SIZE_BYTES.toLong(), webpFormat)
                                Log.d(TAG, "Sticker $i is Static. Processed/Re-encoded.")
                            }

                        } catch (e: Exception) {
                            Log.e(TAG, "Error processing sticker $i", e)
                            call.reject("Sticker $i hatası: ${e.message}")
                            return@Thread
                        }
                        stickerFile.setReadable(true, false)
                    }

                    // Animation flag detection - IMPROVED LOGIC
                    val requestedAnimated = (call.getBoolean("animated", false) == true) ||
                            (name.contains("animated", ignoreCase = true)) ||
                            (identifier.contains("animated", ignoreCase = true)) ||
                            (name.contains("hareketli", ignoreCase = true))

                    var isFinalAnimated = false

                    if (requestedAnimated) {
                         // User requested animated pack.
                         if (anyAnimated) {
                             // Correct: Pack allows animated stickers.
                             // Note: WhatsApp supports mixed packs but technically the pack is "animated" if it contains at least one.
                             isFinalAnimated = true
                         } else {
                             // User requested animated but NO animated stickers found.
                             // Downgrade to avoid WhatsApp rejection.
                             Log.w(TAG, "Pack requested as animated but contains only STATIC files. Downgrading to static pack.")
                             isFinalAnimated = false
                         }
                    } else {
                        // Auto-detection
                        if (anyAnimated) {
                             Log.i(TAG, "Auto-detected animated content. Marking pack as animated.")
                             isFinalAnimated = true
                        }
                    }

                    // Save metadata
                    val jsonObject = org.json.JSONObject()
                    jsonObject.put("identifier", identifier)
                    jsonObject.put("name", name)
                    jsonObject.put("publisher", publisher)
                    jsonObject.put("publisher_website", call.getString("publisherWebsite") ?: "")
                    jsonObject.put("privacy_policy_website", call.getString("privacyPolicyWebsite") ?: "")
                    jsonObject.put("license_agreement_website", call.getString("licenseAgreementWebsite") ?: "")
                    jsonObject.put("animated_sticker_pack", isFinalAnimated)

                    jsonObject.put("stickers", stickerMetadataList)

                    val metadataFile = File(packDir, "metadata.json")
                    metadataFile.writeText(jsonObject.toString())
                    metadataFile.setReadable(true, false)

                    // Verify files exist before launching intent
                    val verifyTray = File(packDir, "tray.png")
                    val verifyStickerCount = packDir.listFiles { f -> f.name.startsWith("sticker_") && f.name.endsWith(".webp") }?.size ?: 0
                    Log.d(TAG, "Pre-launch verification: tray=${verifyTray.exists()} (${verifyTray.length()} bytes), stickers=$verifyStickerCount")

                    if (!verifyTray.exists() || verifyStickerCount == 0) {
                        call.reject("Dosyalar oluşturulamadı")
                        return@Thread
                    }

                    // Launch Intent
                    val authority = "${context.packageName}.stickercontentprovider"
                    val intent = Intent().apply {
                        action = WHATSAPP_STICKER_ACTION
                        putExtra(EXTRA_STICKER_PACK_ID, identifier)
                        putExtra(EXTRA_STICKER_PACK_AUTHORITY, authority)
                        putExtra(EXTRA_STICKER_PACK_NAME, name)
                        setPackage(waPackage)
                        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                         // Don't set FLAG_ACTIVITY_NEW_TASK for startActivityForResult logic
                    }

                    Log.d(TAG, "Launching intent: Action=$WHATSAPP_STICKER_ACTION, Pkg=$waPackage, Auth=$authority")
                    
                    // Verify if intent can be handled
                    val pm = context.packageManager
                    val resolveInfo = pm.resolveActivity(intent, 0)
                    
                    if (resolveInfo == null) {
                        Log.e(TAG, "RESOLVE ACTIVITY FAILED: No app handles this intent explicitly for $waPackage")
                        
                        // Try without package (Diagnostic)
                        val intentAcc = Intent(WHATSAPP_STICKER_ACTION)
                        intentAcc.setType("image/*") // Just to test generic sharing
                        val resolveAny = pm.resolveActivity(intentAcc, 0)
                        Log.d(TAG, "Generic resolver check: ${resolveAny?.activityInfo?.packageName}")

                        call.reject("WhatsApp bu işlemi karşılayamıyor. (Activity Resolve Failed)")
                        return@Thread
                    } else {
                        Log.d(TAG, "Intent resolves to: ${resolveInfo.activityInfo.packageName} / ${resolveInfo.activityInfo.name}")
                    }

                    val activity = activity
                    if (activity != null) {
                        try {
                            activity.runOnUiThread {
                                try {
                                    // startActivityForResult is REQUIRED for WhatsApp to identify the source app
                                    activity.startActivityForResult(intent, ADD_PACK_REQUEST_CODE)
                                    val ret = JSObject()
                                    ret.put("success", true)
                                    ret.put("message", "Sticker paketi WhatsApp'a gönderildi")
                                    call.resolve(ret)
                                } catch (e: ActivityNotFoundException) {
                                    Log.e(TAG, "ActivityNotFoundException despite resolveActivity check", e)
                                    call.reject("WhatsApp başlatılamadı", "WHATSAPP_NOT_FOUND", e)
                                }
                            }
                        } catch (e: Exception) {
                            Log.e(TAG, "runOnUiThread error", e)
                            call.reject("UI Thread hatası: ${e.message}")
                        }
                    } else {
                        // Fallback
                        Log.w(TAG, "No Activity found! WhatsApp sticker addition might fail or not return result.")
                        try {
                            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                            context.startActivity(intent)
                            val ret = JSObject()
                            ret.put("success", true)
                            ret.put("message", "Sticker paketi WhatsApp'a gönderildi (Activity Context Yok)")
                            call.resolve(ret)
                        } catch (e: ActivityNotFoundException) {
                            call.reject("WhatsApp başlatılamadı", "WHATSAPP_NOT_FOUND", e)
                        }
                    }

                } catch (e: Exception) {
                    Log.e(TAG, "Error adding sticker pack", e)
                    call.reject("Hata: ${e.message}", e)
                }
            }.start()
        } catch (e: Exception) {
            Log.e(TAG, "Error initiating sticker pack thread", e)
            call.reject("Hata: ${e.message}", e)
        }
    }

    @PluginMethod
    fun isWhatsAppInstalled(call: PluginCall) {
        val installed = getWhatsAppPackage(context) != null
        val ret = JSObject()
        ret.put("installed", installed)
        call.resolve(ret)
    }

    /**
     * Decode input data from base64 (with or without data: prefix) or file path.
     */
    private fun decodeInputData(data: String): ByteArray {
        return when {
            data.startsWith("data:") -> {
                val base64 = data.substringAfter(",")
                Base64.decode(base64, Base64.DEFAULT)
            }
            data.startsWith("file://") -> {
                val path = data.substring(7)
                val f = File(path)
                if (!f.exists()) throw Exception("File not found: $data")
                f.readBytes()
            }
            data.startsWith("/") -> {
                // Absolute file path
                val f = File(data)
                if (!f.exists()) throw Exception("File not found: $data")
                f.readBytes()
            }
            else -> {
                // Assume raw base64 (no prefix)
                try {
                    Base64.decode(data, Base64.DEFAULT)
                } catch (e: Exception) {
                    throw Exception("Unable to decode input data: ${e.message}")
                }
            }
        }
    }

    private fun getWhatsAppPackage(context: Context): String? {
        val pm = context.packageManager
        try {
            pm.getPackageInfo(WHATSAPP_PACKAGE, 0)
            return WHATSAPP_PACKAGE
        } catch (e: Exception) {}

        try {
            pm.getPackageInfo("com.whatsapp.w4b", 0)
            return "com.whatsapp.w4b"
        } catch (e: Exception) {}

        return null
    }

    private fun isWhatsAppVersionSupported(packageName: String): Boolean {
        try {
            val pm = context.packageManager
            val packageInfo = pm.getPackageInfo(packageName, 0)
            val versionCode = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
                packageInfo.longVersionCode
            } else {
                @Suppress("DEPRECATION")
                packageInfo.versionCode.toLong()
            }

            Log.d(TAG, "WhatsApp ($packageName) version: ${packageInfo.versionName} ($versionCode)")
            return versionCode >= 219244000
        } catch (e: Exception) {
            Log.w(TAG, "Could not check WhatsApp version", e)
            return true
        }
    }

    /**
     * Process image: decode, resize with aspect ratio preservation, compress to target size.
     * Sticker'lar şeffaf arka plan üzerine aspect ratio korunarak ortalanır.
     */
    private fun processImage(data: String, destFile: File, targetSize: Int, maxBytes: Long, format: Bitmap.CompressFormat) {
        var bitmap: Bitmap? = null
        try {
            val byteArray = decodeInputData(data)
            bitmap = BitmapFactory.decodeByteArray(byteArray, 0, byteArray.size)

            if (bitmap == null) throw Exception("Bitmap decode failed for data length: ${data.length}")

            // Resize with aspect ratio preservation
            if (bitmap.width != targetSize || bitmap.height != targetSize) {
                val resized = Bitmap.createBitmap(targetSize, targetSize, Bitmap.Config.ARGB_8888)
                val canvas = Canvas(resized)
                // Transparent background (default for ARGB_8888)

                val scale = Math.min(targetSize.toFloat() / bitmap.width, targetSize.toFloat() / bitmap.height)
                val w = bitmap.width * scale
                val h = bitmap.height * scale
                val x = (targetSize - w) / 2f
                val y = (targetSize - h) / 2f

                val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)
                canvas.drawBitmap(bitmap, null, android.graphics.RectF(x, y, x + w, y + h), paint)

                bitmap.recycle()
                bitmap = resized
            }

            // Compress with quality reduction loop
            var quality = 80
            var compressedBytes: ByteArray? = null

            while (quality > 5) {
                val stream = ByteArrayOutputStream()
                bitmap.compress(format, quality, stream)
                compressedBytes = stream.toByteArray()

                if (compressedBytes.size < maxBytes) {
                    break
                }

                if (format == Bitmap.CompressFormat.PNG) {
                    // PNG is lossless, quality param doesn't help
                    break
                }

                quality -= 10
            }

            if (compressedBytes == null || compressedBytes.size > maxBytes) {
                // Son çare: daha küçük boyuta resize et
                Log.w(TAG, "Could not compress below limit: ${compressedBytes?.size} > $maxBytes, trying smaller dimensions")
                throw Exception("Could not compress image below limit: ${compressedBytes?.size} > $maxBytes")
            }

            FileOutputStream(destFile).use { it.write(compressedBytes) }
            Log.d(TAG, "Image saved: ${destFile.name}, size: ${compressedBytes.size}, quality: $quality")

        } finally {
            bitmap?.recycle()
        }
    }

    private fun saveAnimatedSticker(byteArray: ByteArray, destFile: File, maxBytes: Long) {
        if (byteArray.size > maxBytes) {
            throw Exception("Animated sticker too big: ${byteArray.size} > $maxBytes bytes")
        }

        // Dimension Validation
        try {
            val options = BitmapFactory.Options()
            options.inJustDecodeBounds = true
            BitmapFactory.decodeByteArray(byteArray, 0, byteArray.size, options)

            val width = options.outWidth
            val height = options.outHeight

            Log.d(TAG, "Animated sticker dimensions: ${width}x${height} (Size: ${byteArray.size} bytes)")

            if (width != 512 || height != 512) {
                throw Exception("Invalid Animated Sticker Dimensions: ${width}x${height}. MUST be 512x512.")
            }
        } catch (e: Exception) {
            if (e.message?.contains("Invalid Animated Sticker") == true) {
                throw e
            }
            Log.w(TAG, "Could not validate dimensions of animated sticker: ${e.message}")
        }

        FileOutputStream(destFile).use { it.write(byteArray) }
    }

    private fun isWebPAnimated(bytes: ByteArray): Boolean {
        try {
            if (bytes.size < 21) return false
            if (bytes[0].toChar() != 'R' || bytes[1].toChar() != 'I' || bytes[2].toChar() != 'F' || bytes[3].toChar() != 'F') return false
            if (bytes[8].toChar() != 'W' || bytes[9].toChar() != 'E' || bytes[10].toChar() != 'B' || bytes[11].toChar() != 'P') return false

            if (bytes[12].toChar() == 'V' && bytes[13].toChar() == 'P' && bytes[14].toChar() == '8' && bytes[15].toChar() == 'X') {
                val flags = bytes[20].toInt()
                return (flags and 0x02) != 0
            }
            return false
        } catch (e: Exception) {
            Log.e(TAG, "Error checking WebP animation: ${e.message}")
            return false
        }
    }
}
