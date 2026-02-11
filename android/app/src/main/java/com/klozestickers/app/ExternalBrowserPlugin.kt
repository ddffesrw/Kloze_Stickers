package com.klozestickers.app

import android.content.Intent
import android.net.Uri
import android.util.Log
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * ExternalBrowserPlugin
 *
 * Opens URLs in the system's default browser (NOT Chrome Custom Tabs).
 * This is critical for OAuth redirects because Chrome Custom Tabs
 * silently blocks 302 redirects to custom URL schemes (e.g., com.klozestickers.app://).
 *
 * The system browser handles custom scheme redirects via Android's intent system,
 * which properly triggers the app's intent-filter and delivers the deep link.
 */
@CapacitorPlugin(name = "ExternalBrowser")
class ExternalBrowserPlugin : Plugin() {

    companion object {
        private const val TAG = "ExternalBrowser"
    }

    @PluginMethod
    fun open(call: PluginCall) {
        val url = call.getString("url")
        if (url.isNullOrBlank()) {
            call.reject("URL is required")
            return
        }

        try {
            Log.d(TAG, "Opening external browser: $url")
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
            // FLAG_ACTIVITY_NO_HISTORY: Browser won't stay in recents after redirect
            intent.addFlags(Intent.FLAG_ACTIVITY_NO_HISTORY)
            
            val currentActivity = activity
            if (currentActivity != null) {
                currentActivity.startActivity(intent)
                call.resolve()
            } else {
                Log.e(TAG, "Activity is null, cannot start browser intent")
                call.reject("Activity is null")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to open external browser", e)
            call.reject("Failed to open browser: ${e.message}")
        }
    }
}
