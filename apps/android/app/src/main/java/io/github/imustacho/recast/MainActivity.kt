package io.github.imustacho.recast

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.OpenableColumns
import android.webkit.*
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.FileProvider
import androidx.core.content.IntentCompat
import androidx.core.view.WindowCompat
import androidx.webkit.WebViewAssetLoader
import com.google.gson.Gson
import io.github.imustacho.recast.bridge.TauriBridge
import io.github.imustacho.recast.model.LaunchRequest
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import kotlinx.coroutines.*

class MainActivity : AppCompatActivity() {

    companion object {
        private const val APP_ORIGIN = "https://appassets.androidplatform.net/"
        private const val APP_URL = "${APP_ORIGIN}assets/web/index.html"
        private const val MAX_PICKED_FILES = 50
        private const val MAX_INPUT_BYTES = 1024L * 1024L * 1024L
    }

    private lateinit var webView: WebView
    private var webViewDestroyed = false
    private lateinit var bridge: TauriBridge
    private val gson = Gson()
    private val activityScope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private var incomingCopy: Job? = null

    private var pendingPickerCallbackId: String? = null
    private var pendingLaunchPaths: MutableList<String> = mutableListOf()

    private val openDocumentsLauncher: ActivityResultLauncher<Array<String>> =
        registerForActivityResult(object : ActivityResultContracts.OpenMultipleDocuments() {
            override fun createIntent(context: android.content.Context, input: Array<String>): Intent {
                return super.createIntent(context, input).putExtra(Intent.EXTRA_LOCAL_ONLY, true)
            }
        }) { uris: List<Uri>? ->
            val callbackId = pendingPickerCallbackId
            pendingPickerCallbackId = null

            if (callbackId != null) {
                if (uris.isNullOrEmpty()) {
                    bridge.postSuccess(callbackId, "null")
                } else {
                    activityScope.launch {
                        try {
                            val resolvedPaths = withContext(Dispatchers.IO) { copyUrisToCache(uris) }
                            bridge.postSuccess(callbackId, gson.toJson(resolvedPaths))
                        } catch (failure: Exception) {
                            bridge.postError(callbackId, failure.message ?: "Dosya içe aktarılamadı")
                        }
                    }
                }
            }
        }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        WindowCompat.setDecorFitsSystemWindows(window, true)
        if (savedInstanceState == null) {
            File(cacheDir, "picked_files").deleteRecursively()
            handleIncomingIntent(intent)
        }

        webView = WebView(this).apply {
            WebView.setWebContentsDebuggingEnabled(false)
            setBackgroundColor(Color.parseColor("#F1F5F9"))
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            @Suppress("DEPRECATION")
            if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.Q) {
                settings.allowFileAccessFromFileURLs = false
                settings.allowUniversalAccessFromFileURLs = false
            }
            settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            settings.javaScriptCanOpenWindowsAutomatically = false
            settings.setSupportMultipleWindows(false)
            settings.cacheMode = WebSettings.LOAD_NO_CACHE
            settings.blockNetworkLoads = true
            settings.blockNetworkImage = true
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                settings.safeBrowsingEnabled = false
            }
            // The page already has a responsive viewport. Overview/wide viewport mode makes
            // WebView zoom out whenever a popup temporarily increases the document width.
            settings.loadWithOverviewMode = false
            settings.useWideViewPort = false
            isHorizontalScrollBarEnabled = false
        }

        setContentView(webView)

        // Service workers must not bypass the ordinary WebView request handler.
        ServiceWorkerController.getInstance().serviceWorkerWebSettings.apply {
            blockNetworkLoads = true
            allowFileAccess = false
            allowContentAccess = false
        }

        bridge = TauriBridge(this, webView)
        webView.addJavascriptInterface(bridge, "AndroidBridge")

        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest): Boolean {
                val url = request.url
                if (url.toString().startsWith(APP_ORIGIN)) return false
                return true
            }

            override fun shouldInterceptRequest(
                view: WebView?,
                request: WebResourceRequest?
            ): WebResourceResponse? {
                if (request != null) {
                    if (request.url.toString().startsWith(APP_ORIGIN)) {
                        val response = assetLoader.shouldInterceptRequest(request.url)
                        if (response != null) return response
                    }
                }
                // Never fall through to DNS/network, including missing local assets.
                return WebResourceResponse(
                    "text/plain", "utf-8", 403, "Offline only", emptyMap(),
                    "Recast only loads bundled files".byteInputStream()
                )
            }

            override fun onPageStarted(view: WebView?, url: String?, favicon: android.graphics.Bitmap?) {
                super.onPageStarted(view, url, favicon)
                if (url?.startsWith(APP_ORIGIN) == true) injectTauriShim()
            }

            override fun onRenderProcessGone(view: WebView?, detail: RenderProcessGoneDetail?): Boolean {
                view?.removeJavascriptInterface("AndroidBridge")
                view?.destroy()
                webViewDestroyed = true
                recreate()
                return true
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                return super.onConsoleMessage(consoleMessage)
            }
        }

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    finish()
                }
            }
        })

        // Load the web app from assets
        webView.loadUrl(APP_URL)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleIncomingIntent(intent)
    }

    private fun handleIncomingIntent(intent: Intent?) {
        if (intent == null) return

        val action = intent.action
        val type = intent.type

        if (Intent.ACTION_SEND == action && type != null) {
            val uri = IntentCompat.getParcelableExtra(intent, Intent.EXTRA_STREAM, Uri::class.java)
            if (uri != null) {
                enqueueIncomingCopy(listOf(uri))
            }
        } else if (Intent.ACTION_SEND_MULTIPLE == action && type != null) {
            val uris = IntentCompat.getParcelableArrayListExtra(intent, Intent.EXTRA_STREAM, Uri::class.java)
            if (!uris.isNullOrEmpty()) {
                enqueueIncomingCopy(uris)
            }
        }
    }

    private fun enqueueIncomingCopy(uris: List<Uri>) {
        val previous = incomingCopy
        incomingCopy = activityScope.launch {
            previous?.join()
            try {
                val paths = withContext(Dispatchers.IO) { copyUrisToCache(uris) }
                pendingLaunchPaths.addAll(paths)
            } catch (failure: Exception) {
                android.widget.Toast.makeText(this@MainActivity, failure.message ?: "Dosya içe aktarılamadı", android.widget.Toast.LENGTH_LONG).show()
            }
        }
    }

    suspend fun getPendingLaunchRequest(): LaunchRequest = withContext(Dispatchers.Main) {
        incomingCopy?.join()
        val paths = pendingLaunchPaths.toList()
        pendingLaunchPaths.clear()
        LaunchRequest(
            paths = paths,
            targetFormat = null,
            autoStart = false
        )
    }

    fun launchFilePicker(callbackId: String) {
        if (pendingPickerCallbackId != null) {
            bridge.postError(callbackId, "Dosya seçici zaten açık")
            return
        }
        pendingPickerCallbackId = callbackId
        try {
            openDocumentsLauncher.launch(arrayOf("*/*"))
        } catch (failure: Exception) {
            pendingPickerCallbackId = null
            throw failure
        }
    }

    fun openFile(path: String) {
        val file = File(path).canonicalFile
        if (!file.isFile || !isAppOwnedFile(file)) {
            throw SecurityException("Uygulama dizini dışındaki dosya açılamaz")
        }

        val uri = FileProvider.getUriForFile(this, "${packageName}.fileprovider", file)
        val extension = file.extension.lowercase()
        val mimeType = MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension) ?: "*/*"

        val intent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, mimeType)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }

        startActivity(Intent.createChooser(intent, file.name))
    }

    @Synchronized
    private fun copyUrisToCache(uris: List<Uri>): List<String> {
        require(uris.size <= MAX_PICKED_FILES) { "Tek seferde en fazla $MAX_PICKED_FILES dosya seçilebilir" }
        val paths = mutableListOf<String>()
        val pickedFilesDir = File(cacheDir, "picked_files").apply {
            if (!exists() && !mkdirs()) throw IOException("Geçici dosya dizini oluşturulamadı")
        }

        for (uri in uris.take(MAX_PICKED_FILES)) {
            var fileName: String? = null
            var declaredSize: Long? = null
            if (uri.scheme == "content") {
                contentResolver.query(uri, null, null, null, null)?.use { cursor ->
                    if (cursor.moveToFirst()) {
                        val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                        if (nameIndex != -1) {
                            fileName = cursor.getString(nameIndex)
                        }
                        val sizeIndex = cursor.getColumnIndex(OpenableColumns.SIZE)
                        if (sizeIndex != -1 && !cursor.isNull(sizeIndex)) {
                            declaredSize = cursor.getLong(sizeIndex)
                        }
                    }
                }
            }

            require(declaredSize == null || declaredSize!! <= MAX_INPUT_BYTES) { "Seçilen dosya 1 GB sınırını aşıyor" }

            if (fileName.isNullOrBlank()) {
                fileName = uri.lastPathSegment?.substringAfterLast('/')
                    ?: "file_${System.currentTimeMillis()}"
            }

            var safeName = File(fileName!!).name.replace(Regex("[\\\\/:*?\"<>|\\p{Cntrl}]"), "_")
            if (safeName == "." || safeName == "..") safeName = "recast_input"
            val originalExtension = File(safeName).extension.take(16)
            safeName = File(safeName).nameWithoutExtension.take(80) + if (originalExtension.isBlank()) "" else ".$originalExtension"
            if (File(safeName).extension.isBlank()) {
                val mimeExtension = contentResolver.getType(uri)?.let {
                    MimeTypeMap.getSingleton().getExtensionFromMimeType(it)
                }
                if (!mimeExtension.isNullOrBlank()) safeName = "$safeName.$mimeExtension"
            }
            var safeFile = File(pickedFilesDir, safeName)
            var suffix = 1
            while (safeFile.exists()) {
                val stem = File(safeName).nameWithoutExtension
                val extension = File(safeName).extension
                val candidate = if (extension.isBlank()) "$stem ($suffix)" else "$stem ($suffix).$extension"
                safeFile = File(pickedFilesDir, candidate)
                suffix++
            }
            try {
                val input = contentResolver.openInputStream(uri) ?: throw IOException("Dosya açılamadı")
                input.use {
                    FileOutputStream(safeFile).use { output ->
                        val buffer = ByteArray(DEFAULT_BUFFER_SIZE)
                        var copied = 0L
                        while (true) {
                            val count = input.read(buffer)
                            if (count < 0) break
                            copied += count
                            if (copied > MAX_INPUT_BYTES) throw IOException("Dosya 1 GB sınırını aşıyor")
                            output.write(buffer, 0, count)
                        }
                    }
                }
                require(safeFile.isFile && safeFile.length() > 0L) { "Seçilen dosya boş" }
                paths.add(safeFile.absolutePath)
            } catch (failure: Throwable) {
                safeFile.delete()
                throw IOException("${safeFile.name}: ${failure.message ?: "Dosya okunamadı"}", failure)
            }
        }
        return paths
    }

    private fun isAppOwnedFile(file: File): Boolean {
        val targetPath = file.canonicalPath
        val roots = listOfNotNull(
            cacheDir,
            filesDir,
            externalCacheDir,
            getExternalFilesDir(null)
        ).map { it.canonicalFile.canonicalPath }
        return roots.any { root -> targetPath == root || targetPath.startsWith(root + File.separator) }
    }

    override fun onDestroy() {
        activityScope.cancel()
        if (::bridge.isInitialized) bridge.close()
        if (::webView.isInitialized && !webViewDestroyed) {
            webView.removeJavascriptInterface("AndroidBridge")
            webView.stopLoading()
            webView.destroy()
        }
        super.onDestroy()
    }

    private fun injectTauriShim() {
        val shimScript = """
            (function() {
                if (window.__TAURI_INTERNALS__) return;

                // @tauri-apps/api v2 uses this flag in isTauri().
                window.isTauri = true;
                window.__recast_callbacks = {};
                window.__TAURI_INTERNALS__ = {
                    invoke: function(cmd, args, options) {
                        return new Promise(function(resolve, reject) {
                            var callbackId = 'cb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                            window.__recast_callbacks[callbackId] = { resolve: resolve, reject: reject };
                            window.AndroidBridge.invoke(cmd, JSON.stringify(args || {}), callbackId);
                        });
                    },
                    transformCallback: function(callback, once) {
                        var id = 'cb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                        window.__recast_callbacks[id] = { resolve: callback, reject: function() {} };
                        return id;
                    },
                    unregisterCallback: function(id) {
                        delete window.__recast_callbacks[id];
                    },
                    callbacks: {},
                    metadata: {
                        currentWindow: { label: "main" }
                    },
                    convertFileSrc: function(filePath, protocol) {
                        return filePath;
                    }
                };

                window.__TAURI_EVENT_PLUGIN_INTERNALS__ = {
                    unregisterListener: function(event, eventId) {}
                };
            })();
        """.trimIndent()
        webView.evaluateJavascript(shimScript, null)
    }
}
