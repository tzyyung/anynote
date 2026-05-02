package com.aidaris.anynote

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.util.Base64
import android.widget.Toast
import androidx.core.content.IntentCompat
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

private const val MAX_IMAGE_BYTES = 8L * 1024 * 1024  // 8 MB

class ShareActivity : androidx.appcompat.app.AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        handle(intent)
    }

    private fun handle(intent: Intent?) {
        val type = intent?.type
        if (intent?.action != Intent.ACTION_SEND || type == null) {
            toast("anynote: nothing to save"); finish(); return
        }

        when {
            type.startsWith("text/") -> handleText(intent)
            type.startsWith("image/") -> handleImage(intent)
            else -> { toast("anynote: unsupported type $type"); finish() }
        }
    }

    private fun handleText(intent: Intent) {
        val text = intent.getStringExtra(Intent.EXTRA_TEXT).orEmpty()
        if (text.isBlank()) { toast("anynote: empty text"); finish(); return }

        val url = extractUrl(text)
        val payload = JSONObject().apply {
            if (url != null && url == text.trim()) {
                put("type", "url")
                put("source_url", url)
            } else {
                put("type", "highlight")
                put("source_url", url ?: "")
                put("content", text)
            }
            put("device", "android")
        }
        send(payload, null)
    }

    private fun handleImage(intent: Intent) {
        val uri = IntentCompat.getParcelableExtra(intent, Intent.EXTRA_STREAM, Uri::class.java)
        if (uri == null) { toast("anynote: no image"); finish(); return }

        val payload = JSONObject().apply {
            put("type", "image")
            put("source_url", "android-share")
            put("device", "android")
        }
        send(payload, uri)
    }

    private fun send(payload: JSONObject, imageUri: Uri?) {
        toast("anynote: sending…")
        lifecycleScope.launch {
            val result = withContext(Dispatchers.IO) { post(payload, imageUri) }
            toast("anynote: ${result.message}")
            finish()
        }
    }

    private data class PostResult(val ok: Boolean, val message: String)

    private fun post(payload: JSONObject, imageUri: Uri?): PostResult {
        return try {
            val params = mutableListOf<Pair<String, String>>().apply {
                add("secret" to BuildConfig.ANYNOTE_SECRET)
                add("payload" to payload.toString())
                if (imageUri != null) {
                    val img = readImageAsBase64(imageUri)
                        ?: return PostResult(false, "image too large or unreadable")
                    add("image_b64" to img.first)
                    add("image_mime" to img.second)
                }
            }
            val body = params.joinToString("&") { (k, v) ->
                "${URLEncoder.encode(k, "UTF-8")}=${URLEncoder.encode(v, "UTF-8")}"
            }

            val conn = URL(BuildConfig.ANYNOTE_URL).openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.doOutput = true
            conn.instanceFollowRedirects = true
            conn.setRequestProperty("Content-Type", "application/x-www-form-urlencoded")
            conn.connectTimeout = 15000
            conn.readTimeout = 30000
            conn.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }

            val code = conn.responseCode
            val resp = (if (code in 200..299) conn.inputStream else conn.errorStream)
                ?.bufferedReader()?.use { it.readText() } ?: ""
            android.util.Log.d("anynote", "code=$code resp=$resp")

            if (code !in 200..299) return PostResult(false, "http $code")

            val json = try { JSONObject(resp) } catch (e: Exception) { null }
            when {
                json == null -> PostResult(false, "non-JSON response")
                json.optBoolean("ok") -> {
                    val row = json.opt("row")?.toString() ?: "?"
                    PostResult(true, "saved ✓ (row $row)")
                }
                else -> PostResult(false, "failed: ${json.optString("error", "unknown")}")
            }
        } catch (e: Exception) {
            android.util.Log.e("anynote", "post failed", e)
            PostResult(false, "error: ${e.message ?: e.javaClass.simpleName}")
        }
    }

    /**
     * Read image at uri and return (base64, mime), or null if too large / unreadable.
     * Bails out as soon as size exceeds MAX_IMAGE_BYTES, without buffering the full file.
     */
    private fun readImageAsBase64(uri: Uri): Pair<String, String>? {
        val mime = contentResolver.getType(uri) ?: "image/jpeg"

        // Pre-flight size check via AssetFileDescriptor (cheap, may report -1 for unknown)
        val declaredSize = try {
            contentResolver.openAssetFileDescriptor(uri, "r")?.use { it.length }
        } catch (e: Exception) {
            android.util.Log.w("anynote", "size check failed", e); null
        }
        if (declaredSize != null && declaredSize > 0 && declaredSize > MAX_IMAGE_BYTES) {
            return null
        }

        val input = try {
            contentResolver.openInputStream(uri)
        } catch (e: Exception) {
            android.util.Log.w("anynote", "open stream failed", e); return null
        } ?: return null

        val out = ByteArrayOutputStream()
        input.use { stream ->
            val buf = ByteArray(8192)
            var total = 0L
            while (true) {
                val n = stream.read(buf)
                if (n <= 0) break
                total += n
                if (total > MAX_IMAGE_BYTES) return null
                out.write(buf, 0, n)
            }
        }
        return Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP) to mime
    }

    private fun extractUrl(text: String): String? {
        val regex = Regex("""https?://[^\s]+""")
        return regex.find(text)?.value
    }

    private fun toast(msg: String) {
        Toast.makeText(this, msg, Toast.LENGTH_SHORT).show()
    }
}
