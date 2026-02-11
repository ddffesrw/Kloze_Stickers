package com.klozestickers.app

import android.content.*
import android.content.res.AssetFileDescriptor
import android.database.Cursor
import android.database.MatrixCursor
import android.net.Uri
import android.os.ParcelFileDescriptor
import android.util.Log
import java.io.File
import java.io.FileNotFoundException

/**
 * Sticker Content Provider
 * WhatsApp'ın sticker dosyalarına erişmesi için ContentProvider
 * WhatsApp Sticker SDK formatına uygun (resmi SDK ile uyumlu)
 */
class StickerContentProvider : ContentProvider() {

    companion object {
        private const val TAG = "WhatsAppStickers" // Unified tag for easy filtering by user
        private const val AUTHORITY = "com.klozestickers.app.stickercontentprovider"

        // URI matcher codes - resmi WhatsApp SDK sıralaması
        private const val METADATA = 1
        private const val METADATA_CODE_FOR_SINGLE_PACK = 2
        private const val STICKERS = 3
        private const val STICKERS_ASSET = 4

        // Metadata columns - WhatsApp SDK tam format
        private val METADATA_COLUMNS = arrayOf(
            "sticker_pack_identifier",
            "sticker_pack_name",
            "sticker_pack_publisher",
            "sticker_pack_icon",
            "android_play_store_link",
            "ios_app_download_link",
            "sticker_pack_publisher_email",
            "sticker_pack_publisher_website",
            "sticker_pack_privacy_policy_website",
            "sticker_pack_license_agreement_website",
            "image_data_version",
            "whatsapp_will_not_cache_stickers",
            "animated_sticker_pack"
        )

        // Sticker columns - WhatsApp SDK format
        private val STICKER_COLUMNS = arrayOf(
            "sticker_file_name",
            "sticker_emoji",
            "sticker_accessibility_text"
        )
    }

    private lateinit var uriMatcher: UriMatcher

    /**
     * Sticker dosyalarının saklandığı dizin.
     * filesDir kullanılır - cacheDir'den farklı olarak sistem tarafından otomatik silinmez.
     */
    private fun getStickersDir(): File {
        val ctx = context ?: throw IllegalStateException("Context is null")
        return File(ctx.filesDir, "stickers")
    }

    override fun onCreate(): Boolean {
        Log.i(TAG, "onCreate() called - Provider initializing")

        // URI Matcher kurulumu - resmi WhatsApp SDK formatı
        // content://authority/metadata - tüm paketler
        // content://authority/metadata/pack_id - tek paket
        // content://authority/stickers/pack_id - sticker listesi
        // content://authority/stickers_asset/pack_id/filename - sticker veya tray dosyası
        uriMatcher = UriMatcher(UriMatcher.NO_MATCH).apply {
            addURI(AUTHORITY, "metadata", METADATA)
            addURI(AUTHORITY, "metadata/*", METADATA_CODE_FOR_SINGLE_PACK)
            addURI(AUTHORITY, "stickers/*", STICKERS)
            addURI(AUTHORITY, "stickers_asset/*/*", STICKERS_ASSET)
        }

        Log.i(TAG, "UriMatcher initialized with authority: $AUTHORITY")
        return true
    }

    override fun query(
        uri: Uri,
        projection: Array<out String>?,
        selection: String?,
        selectionArgs: Array<out String>?,
        sortOrder: String?
    ): Cursor? {
        val code = uriMatcher.match(uri)
        Log.e(TAG, ">>> QUERY: $uri (Code: $code)")
        
        return try {
            val cursor = when (code) {
                METADATA -> {
                    Log.d(TAG, "-> Match: METADATA")
                    getPacksMetadata()
                }
                METADATA_CODE_FOR_SINGLE_PACK -> {
                    val identifier = uri.lastPathSegment
                    Log.d(TAG, "-> Match: SINGLE METADATA ($identifier)")
                    getSinglePackMetadata(identifier)
                }
                STICKERS -> {
                    val identifier = uri.lastPathSegment
                    Log.d(TAG, "-> Match: STICKERS LIST ($identifier)")
                    getStickersForPack(identifier)
                }
                else -> {
                    Log.e(TAG, "-> Match: UNKNOWN ($code)")
                    null
                }
            }
            if (cursor != null) {
                Log.d(TAG, "<<< Returning Cursor with ${cursor.count} rows")
                 // Log generic content for debug
                 // cursor.moveToFirst()
                 // Log.d(TAG, "First col: ${cursor.getColumnName(0)}")
            } else {
                Log.e(TAG, "<<< Returning NULL Cursor")
            }
            cursor
        } catch (e: Exception) {
            Log.e(TAG, "!!! QUERY ERROR: ${e.message}", e)
            null
        }
    }

    override fun getType(uri: Uri): String? {
        val code = uriMatcher.match(uri)
        return when (code) {
            METADATA -> "vnd.android.cursor.dir/vnd.$AUTHORITY.metadata"
            METADATA_CODE_FOR_SINGLE_PACK -> "vnd.android.cursor.item/vnd.$AUTHORITY.metadata"
            STICKERS -> "vnd.android.cursor.dir/vnd.$AUTHORITY.stickers"
            STICKERS_ASSET -> "image/webp"
            else -> null
        }
    }

    /**
     * WhatsApp sticker/tray dosyalarını bu method ile okur.
     * URI formatı: stickers_asset/<pack_id>/<filename>
     * Tray icon da aynı pattern üzerinden sunulur (resmi SDK ile uyumlu).
     */
    override fun openAssetFile(uri: Uri, mode: String): AssetFileDescriptor? {
        Log.e(TAG, ">>> OPEN ASSET: $uri (Mode: $mode)")
        
        val ctx = context ?: throw IllegalStateException("Context is null")
        val pathSegments = uri.pathSegments

        if (pathSegments.size != 3) {
            Log.e(TAG, "!!! Invalid URI format: $uri")
            throw FileNotFoundException("Invalid URI format")
        }

        val identifier = pathSegments[1]
        val fileName = pathSegments[2]
        
        Log.d(TAG, "-> Target: Pack=$identifier, File=$fileName")

        val packDir = File(getStickersDir(), identifier)
        var file = File(packDir, fileName)

        // Tray icon fallback
        if (!file.exists() && (fileName == "tray.png" || fileName == "tray.webp")) {
            val pngFile = File(packDir, "tray.png")
            val webpFile = File(packDir, "tray.webp")
            if (pngFile.exists()) {
                file = pngFile
                Log.d(TAG, "-> Fallback to tray.png")
            } else if (webpFile.exists()) {
                file = webpFile
                Log.d(TAG, "-> Fallback to tray.webp")
            }
        }

        if (!file.exists()) {
            Log.e(TAG, "!!! FILE NOT FOUND: ${file.absolutePath}")
            // Debug dir listing
             if (packDir.exists()) {
                 Log.e(TAG, "Dir contents: ${packDir.list()?.joinToString()}")
             } else {
                 Log.e(TAG, "Pack dir does not exist: ${packDir.absolutePath}")
             }
            throw FileNotFoundException("File not found: $fileName")
        }

        Log.d(TAG, "-> Serving file: ${file.absolutePath} (${file.length()} bytes)")

        return try {
            AssetFileDescriptor(
                ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY),
                0,
                file.length()
            )
        } catch (e: Exception) {
            Log.e(TAG, "!!! Error opening file descriptor: ${e.message}", e)
            throw FileNotFoundException("Error opening file: ${e.message}")
        }
    }

    override fun openFile(uri: Uri, mode: String): ParcelFileDescriptor? {
        Log.d(TAG, "openFile() called, delegating to openAssetFile")
        return openAssetFile(uri, mode)?.parcelFileDescriptor
    }

    private fun getPacksMetadata(): Cursor {
        val cursor = MatrixCursor(METADATA_COLUMNS)
        val stickersDir = getStickersDir()

        Log.d(TAG, "Stickers dir: ${stickersDir.absolutePath}, exists: ${stickersDir.exists()}")

        if (!stickersDir.exists()) {
            Log.w(TAG, "Stickers directory does not exist")
            return cursor
        }

        val packDirs = stickersDir.listFiles()
        Log.d(TAG, "Found ${packDirs?.size ?: 0} pack directories")

        packDirs?.forEach { packDir ->
            if (packDir.isDirectory) {
                val identifier = packDir.name
                val metadataFile = File(packDir, "metadata.json")

                if (metadataFile.exists()) {
                    val metadata = parseMetadata(metadataFile)
                    addPackRow(cursor, identifier, metadata, packDir)
                }
            }
        }

        Log.d(TAG, "Returning ${cursor.count} packs")
        return cursor
    }

    private fun getSinglePackMetadata(identifier: String?): Cursor {
        val cursor = MatrixCursor(METADATA_COLUMNS)

        if (identifier == null) {
            Log.e(TAG, "Identifier is null")
            return cursor
        }

        val packDir = File(getStickersDir(), identifier)
        val metadataFile = File(packDir, "metadata.json")

        Log.d(TAG, "Single pack: $identifier, dir exists: ${packDir.exists()}, metadata exists: ${metadataFile.exists()}")

        if (metadataFile.exists()) {
            val metadata = parseMetadata(metadataFile)
            addPackRow(cursor, identifier, metadata, packDir)
        }

        return cursor
    }

    private fun addPackRow(cursor: MatrixCursor, identifier: String, metadata: Map<String, String>, packDir: File) {
        val trayFile = File(packDir, "tray.png")
        val trayIconName = if (trayFile.exists()) "tray.png" else {
            val trayWebp = File(packDir, "tray.webp")
            if (trayWebp.exists()) "tray.webp" else "tray.png"
        }

        Log.d(TAG, "Adding pack row: identifier=$identifier, name=${metadata["name"]}, tray=$trayIconName")

        cursor.addRow(arrayOf(
            identifier,                                                                     // sticker_pack_identifier
            metadata["name"] ?: "Sticker Pack",                                            // sticker_pack_name
            metadata["publisher"] ?: "Unknown",                                            // sticker_pack_publisher
            trayIconName,                                                                   // sticker_pack_icon
            "https://play.google.com/store/apps/details?id=com.klozestickers.app",         // android_play_store_link
            "",                                                                             // ios_app_download_link
            "",                                                                             // publisher_email
            metadata["publisher_website"] ?: "",                                           // publisher_website
            metadata["privacy_policy_website"] ?: "",                                      // privacy_policy_website
            metadata["license_agreement_website"] ?: "",                                   // license_agreement_website
            "1",                                                                            // image_data_version
            0,                                                                              // whatsapp_will_not_cache_stickers
            if (metadata["animated_sticker_pack"] == "true") 1 else 0                      // animated_sticker_pack
        ))
    }

    private fun getStickersForPack(identifier: String?): Cursor {
        val cursor = MatrixCursor(STICKER_COLUMNS)

        if (identifier == null) {
            Log.e(TAG, "Pack identifier is null")
            return cursor
        }

        val packDir = File(getStickersDir(), identifier)
        Log.d(TAG, "Getting stickers from: ${packDir.absolutePath}, exists: ${packDir.exists()}")

        if (!packDir.exists()) {
            Log.e(TAG, "Pack directory not found")
            return cursor
        }

        // Read emoji mapping from metadata.json
        val metadataFile = File(packDir, "metadata.json")
        val emojiMap = mutableMapOf<String, String>()

        if (metadataFile.exists()) {
            try {
                val jsonString = metadataFile.readText()
                val jsonObject = org.json.JSONObject(jsonString)
                val stickersArray = jsonObject.optJSONArray("stickers")
                if (stickersArray != null) {
                    for (i in 0 until stickersArray.length()) {
                        val stickerObj = stickersArray.getJSONObject(i)
                        val fileName = stickerObj.optString("image_file")
                        val emojisArray = stickerObj.optJSONArray("emojis")

                        if (fileName.isNotEmpty() && emojisArray != null) {
                            val emojiList = mutableListOf<String>()
                            for (j in 0 until emojisArray.length()) {
                                emojiList.add(emojisArray.getString(j))
                            }
                            if (emojiList.isNotEmpty()) {
                                emojiMap[fileName] = emojiList.joinToString(",")
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error parsing metadata for emojis", e)
            }
        }

        val stickerFiles = packDir.listFiles { file ->
            file.name.endsWith(".webp") && file.name.startsWith("sticker_")
        }?.sortedBy { it.name }

        Log.d(TAG, "Found ${stickerFiles?.size ?: 0} sticker files")

        stickerFiles?.forEach { stickerFile ->
            // Use mapped emojis or default if missing
            val emojis = emojiMap[stickerFile.name] ?: "😀,😊"
            Log.d(TAG, "Adding sticker: ${stickerFile.name}, emojis: $emojis")
            cursor.addRow(arrayOf(
                stickerFile.name,
                emojis,
                ""
            ))
        }

        Log.d(TAG, "Returning ${cursor.count} stickers")
        return cursor
    }

    private fun parseMetadata(file: File): Map<String, String> {
        val metadata = mutableMapOf<String, String>()

        try {
            val jsonString = file.readText()
            Log.d(TAG, "Parsing metadata: $jsonString")

            val jsonObject = org.json.JSONObject(jsonString)
            val iterator = jsonObject.keys()

            while (iterator.hasNext()) {
                val key = iterator.next()
                val value = jsonObject.optString(key)
                if (value.isNotEmpty()) {
                    metadata[key] = value
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing metadata: ${e.message}", e)
        }

        return metadata
    }

    override fun insert(uri: Uri, values: ContentValues?): Uri? = null
    override fun delete(uri: Uri, selection: String?, selectionArgs: Array<out String>?): Int = 0
    override fun update(uri: Uri, values: ContentValues?, selection: String?, selectionArgs: Array<out String>?): Int = 0
}
