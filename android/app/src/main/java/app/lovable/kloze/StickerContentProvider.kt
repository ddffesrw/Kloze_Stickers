package app.lovable.kloze

import android.content.*
import android.database.Cursor
import android.database.MatrixCursor
import android.net.Uri
import android.os.ParcelFileDescriptor
import java.io.File
import java.io.FileNotFoundException

/**
 * Sticker Content Provider
 * WhatsApp'ın sticker dosyalarına erişmesi için ContentProvider
 */
class StickerContentProvider : ContentProvider() {

    companion object {
        private const val AUTHORITY = "app.lovable.d7685d6b5c3346488a767907e61fa87e.stickercontentprovider"
        private const val STICKER_PACK_METADATA_CODE = 1
        private const val STICKER_PACK_CODE = 2
        private const val STICKERS_CODE = 3
        private const val STICKERS_ASSET_CODE = 4

        // Metadata columns
        private val METADATA_COLUMNS = arrayOf(
            "identifier",
            "name",
            "publisher",
            "tray_image_file",
            "publisher_email",
            "publisher_website",
            "privacy_policy_website",
            "license_agreement_website",
            "image_data_version",
            "avoid_cache",
            "animated_sticker_pack"
        )

        // Sticker columns
        private val STICKER_COLUMNS = arrayOf(
            "image_file",
            "emojis"
        )
    }

    private lateinit var uriMatcher: UriMatcher

    override fun onCreate(): Boolean {
        val context = context ?: return false

        // URI Matcher kurulumu
        uriMatcher = UriMatcher(UriMatcher.NO_MATCH).apply {
            addURI(AUTHORITY, "metadata", STICKER_PACK_METADATA_CODE)
            addURI(AUTHORITY, "metadata/*", STICKER_PACK_CODE)
            addURI(AUTHORITY, "stickers/*", STICKERS_CODE)
            addURI(AUTHORITY, "stickers_asset/*/*", STICKERS_ASSET_CODE)
        }

        return true
    }

    override fun query(
        uri: Uri,
        projection: Array<out String>?,
        selection: String?,
        selectionArgs: Array<out String>?,
        sortOrder: String?
    ): Cursor? {
        return when (uriMatcher.match(uri)) {
            STICKER_PACK_METADATA_CODE -> getPacksMetadata()
            STICKER_PACK_CODE -> getSinglePackMetadata(uri)
            STICKERS_CODE -> getStickersForPack(uri)
            else -> throw IllegalArgumentException("Unknown URI: $uri")
        }
    }

    override fun getType(uri: Uri): String? {
        return when (uriMatcher.match(uri)) {
            STICKER_PACK_METADATA_CODE -> "vnd.android.cursor.dir/vnd.$AUTHORITY.metadata"
            STICKER_PACK_CODE -> "vnd.android.cursor.item/vnd.$AUTHORITY.metadata"
            STICKERS_CODE -> "vnd.android.cursor.dir/vnd.$AUTHORITY.stickers"
            STICKERS_ASSET_CODE -> "image/webp"
            else -> throw IllegalArgumentException("Unknown URI: $uri")
        }
    }

    override fun openFile(uri: Uri, mode: String): ParcelFileDescriptor? {
        if (uriMatcher.match(uri) != STICKERS_ASSET_CODE) {
            throw IllegalArgumentException("Unknown URI: $uri")
        }

        val context = context ?: throw IllegalStateException("Context is null")
        val pathSegments = uri.pathSegments

        if (pathSegments.size < 3) {
            throw IllegalArgumentException("Invalid URI: $uri")
        }

        val identifier = pathSegments[1]
        val fileName = pathSegments[2]

        // Cache dizininden dosyayı bul
        val file = File(context.cacheDir, "stickers/$identifier/$fileName")

        if (!file.exists()) {
            throw FileNotFoundException("Sticker file not found: ${file.absolutePath}")
        }

        return ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY)
    }

    /**
     * Tüm paketlerin metadata'sını döndür
     */
    private fun getPacksMetadata(): Cursor {
        val context = context ?: return MatrixCursor(METADATA_COLUMNS, 0)
        val cursor = MatrixCursor(METADATA_COLUMNS)

        // Cache dizinindeki tüm paketleri tara
        val stickersDir = File(context.cacheDir, "stickers")
        if (!stickersDir.exists()) {
            return cursor
        }

        stickersDir.listFiles()?.forEach { packDir ->
            if (packDir.isDirectory) {
                val identifier = packDir.name
                val metadataFile = File(packDir, "metadata.json")

                if (metadataFile.exists()) {
                    val metadata = parseMetadata(metadataFile)
                    cursor.addRow(arrayOf(
                        metadata["identifier"],
                        metadata["name"],
                        metadata["publisher"],
                        "tray.png",
                        "", // publisher_email
                        metadata["publisher_website"] ?: "",
                        metadata["privacy_policy_website"] ?: "",
                        metadata["license_agreement_website"] ?: "",
                        "1", // image_data_version
                        false, // avoid_cache
                        false  // animated_sticker_pack
                    ))
                }
            }
        }

        return cursor
    }

    /**
     * Tek bir paketin metadata'sını döndür
     */
    private fun getSinglePackMetadata(uri: Uri): Cursor {
        val context = context ?: return MatrixCursor(METADATA_COLUMNS, 0)
        val cursor = MatrixCursor(METADATA_COLUMNS)

        val identifier = uri.lastPathSegment ?: return cursor
        val packDir = File(context.cacheDir, "stickers/$identifier")
        val metadataFile = File(packDir, "metadata.json")

        if (metadataFile.exists()) {
            val metadata = parseMetadata(metadataFile)
            cursor.addRow(arrayOf(
                metadata["identifier"],
                metadata["name"],
                metadata["publisher"],
                "tray.png",
                "",
                metadata["publisher_website"] ?: "",
                metadata["privacy_policy_website"] ?: "",
                metadata["license_agreement_website"] ?: "",
                "1",
                false,
                false
            ))
        }

        return cursor
    }

    /**
     * Bir paketteki tüm sticker'ları döndür
     */
    private fun getStickersForPack(uri: Uri): Cursor {
        val context = context ?: return MatrixCursor(STICKER_COLUMNS, 0)
        val cursor = MatrixCursor(STICKER_COLUMNS)

        val identifier = uri.lastPathSegment ?: return cursor
        val packDir = File(context.cacheDir, "stickers/$identifier")

        if (!packDir.exists()) {
            return cursor
        }

        // Tüm .webp dosyalarını listele
        packDir.listFiles { file ->
            file.name.endsWith(".webp") && file.name.startsWith("sticker_")
        }?.forEach { stickerFile ->
            cursor.addRow(arrayOf(
                stickerFile.name,
                "" // emojis - şimdilik boş
            ))
        }

        return cursor
    }

    /**
     * Metadata JSON'ını parse et
     */
    private fun parseMetadata(file: File): Map<String, String> {
        val metadata = mutableMapOf<String, String>()

        try {
            val json = file.readText()
            // Basit JSON parsing (production'da Gson/Moshi kullan)
            val pairs = json
                .removeSurrounding("{", "}")
                .split(",")
                .map { it.trim() }

            pairs.forEach { pair ->
                val parts = pair.split(":")
                if (parts.size == 2) {
                    val key = parts[0].trim().removeSurrounding("\"")
                    val value = parts[1].trim().removeSurrounding("\"")
                    metadata[key] = value
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }

        return metadata
    }

    // ContentProvider boilerplate methods
    override fun insert(uri: Uri, values: ContentValues?): Uri? = null
    override fun delete(uri: Uri, selection: String?, selectionArgs: Array<out String>?): Int = 0
    override fun update(uri: Uri, values: ContentValues?, selection: String?, selectionArgs: Array<out String>?): Int = 0
}
