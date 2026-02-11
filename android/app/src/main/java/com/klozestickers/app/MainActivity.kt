package com.klozestickers.app

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.os.Parcelable
import android.util.Base64
import com.getcapacitor.BridgeActivity
import com.getcapacitor.JSObject
import java.io.ByteArrayOutputStream
import java.io.InputStream

class MainActivity : BridgeActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(WhatsAppStickersPlugin::class.java)
        registerPlugin(ExternalBrowserPlugin::class.java)
        super.onCreate(savedInstanceState)

        // Intent'ten gelen paylaşımları işle
        android.util.Log.d("MainActivity", "onCreate: intent=${intent.action} data=${intent.dataString}")
        handleIntent(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        // Log the intent for debugging
        android.util.Log.d("MainActivity", "onNewIntent: action=${intent.action}, data=${intent.dataString}")
        handleIntent(intent)
    }

    private fun handleIntent(intent: Intent) {
        when (intent.action) {
            Intent.ACTION_SEND -> {
                if (intent.type?.startsWith("image/") == true) {
                    handleSingleImage(intent)
                }
            }
            Intent.ACTION_SEND_MULTIPLE -> {
                if (intent.type?.startsWith("image/") == true) {
                    handleMultipleImages(intent)
                }
            }
        }
    }

    private fun handleSingleImage(intent: Intent) {
        val imageUri = intent.getParcelableExtra<Parcelable>(Intent.EXTRA_STREAM) as? Uri
        imageUri?.let { uri ->
            val base64 = uriToBase64(uri)
            if (base64 != null) {
                notifyWebView(listOf(base64))
            }
        }
    }

    private fun handleMultipleImages(intent: Intent) {
        val imageUris = intent.getParcelableArrayListExtra<Parcelable>(Intent.EXTRA_STREAM)
        imageUris?.let { uris ->
            val base64List = uris.mapNotNull { parcelable ->
                (parcelable as? Uri)?.let { uriToBase64(it) }
            }
            if (base64List.isNotEmpty()) {
                notifyWebView(base64List)
            }
        }
    }

    private fun uriToBase64(uri: Uri): String? {
        return try {
            val inputStream: InputStream? = contentResolver.openInputStream(uri)
            inputStream?.use { stream ->
                val byteArrayOutputStream = ByteArrayOutputStream()
                val buffer = ByteArray(1024)
                var bytesRead: Int
                while (stream.read(buffer).also { bytesRead = it } != -1) {
                    byteArrayOutputStream.write(buffer, 0, bytesRead)
                }
                val bytes = byteArrayOutputStream.toByteArray()
                Base64.encodeToString(bytes, Base64.NO_WRAP)
            }
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    private fun notifyWebView(base64Images: List<String>) {
        // WebView'a event gönder
        bridge?.let { b ->
            val data = JSObject()
            val imagesArray = base64Images.toTypedArray()
            data.put("images", imagesArray)
            data.put("count", base64Images.size)

            // JavaScript'e event gönder
            b.webView?.post {
                b.webView?.evaluateJavascript(
                    """
                    window.dispatchEvent(new CustomEvent('sharedImages', {
                        detail: {
                            images: ${base64Images.map { "\"$it\"" }},
                            count: ${base64Images.size}
                        }
                    }));
                    """.trimIndent(),
                    null
                )
            }
        }
    }
}
