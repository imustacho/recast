package io.github.imustacho.recast

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.provider.OpenableColumns
import android.webkit.*
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.FileProvider
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.webkit.WebViewAssetLoader
import com.google.gson.Gson
import io.github.imustacho.recast.bridge.TauriBridge
import io.github.imustacho.recast.model.LaunchRequest
import java.io.File
import java.io.FileOutputStream

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var bridge: TauriBridge
    private val gson = Gson()

    private var pendingPickerCallbackId: String? = null
    private var pendingLaunchPaths: MutableList<String> = mutableListOf()

    private val openDocumentsLauncher: ActivityResultLauncher<Array<String>> =
        registerForActivityResult(ActivityResultContracts.OpenMultipleDocuments()) { uris: List<Uri>? ->
            val callbackId = pendingPickerCallbackId
            pendingPickerCallbackId = null

            if (callbackId != null) {
                if (uris.isNullOrEmpty()) {
                    bridge.postSuccess(callbackId, "null")
                } else {
                    val resolvedPaths = copyUrisToCache(uris)
                    bridge.postSuccess(callbackId, gson.toJson(resolvedPaths))
                }
            }
        }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        WindowCompat.setDecorFitsSystemWindows(window, true)
        window.statusBarColor = Color.parseColor("#F1F5F9")
        window.navigationBarColor = Color.parseColor("#F1F5F9")

        handleIncomingIntent(intent)

        webView = WebView(this).apply {
            setBackgroundColor(Color.parseColor("#F1F5F9"))
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.allowFileAccess = true
            settings.databaseEnabled = true
            settings.loadWithOverviewMode = true
            settings.useWideViewPort = true
        }

        setContentView(webView)

        bridge = TauriBridge(this, webView)
        webView.addJavascriptInterface(bridge, "AndroidBridge")

        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(
                view: WebView?,
                request: WebResourceRequest?
            ): WebResourceResponse? {
                if (request != null) {
                    val response = assetLoader.shouldInterceptRequest(request.url)
                    if (response != null) return response
                }
                return super.shouldInterceptRequest(view, request)
            }

            override fun onPageStarted(view: WebView?, url: String?, favicon: android.graphics.Bitmap?) {
                super.onPageStarted(view, url, favicon)
                injectTauriShim()
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
        webView.loadUrl("https://appassets.androidplatform.net/assets/web/index.html")
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
            val uri = intent.getParcelableExtra<Uri>(Intent.EXTRA_STREAM)
            if (uri != null) {
                val paths = copyUrisToCache(listOf(uri))
                pendingLaunchPaths.addAll(paths)
            }
        } else if (Intent.ACTION_SEND_MULTIPLE == action && type != null) {
            val uris = intent.getParcelableArrayListExtra<Uri>(Intent.EXTRA_STREAM)
            if (!uris.isNullOrEmpty()) {
                val paths = copyUrisToCache(uris)
                pendingLaunchPaths.addAll(paths)
            }
        }
    }

    fun getPendingLaunchRequest(): LaunchRequest {
        val paths = pendingLaunchPaths.toList()
        pendingLaunchPaths.clear()
        return LaunchRequest(
            paths = paths,
            targetFormat = null,
            autoStart = false
        )
    }

    fun launchFilePicker(callbackId: String) {
        pendingPickerCallbackId = callbackId
        openDocumentsLauncher.launch(arrayOf("*/*"))
    }

    fun openFile(path: String) {
        try {
            val file = File(path)
            if (!file.exists()) return

            val uri = FileProvider.getUriForFile(this, "${packageName}.fileprovider", file)
            val extension = file.extension.lowercase()
            val mimeType = MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension) ?: "*/*"

            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(uri, mimeType)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }

            val chooser = Intent.createChooser(intent, file.name)
            startActivity(chooser)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun openWebUrl(url: String) {
        try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            startActivity(intent)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun copyUrisToCache(uris: List<Uri>): List<String> {
        val paths = mutableListOf<String>()
        val cacheDir = File(cacheDir, "picked_files").apply { mkdirs() }

        for (uri in uris) {
            var fileName: String? = null
            if (uri.scheme == "content") {
                contentResolver.query(uri, null, null, null, null)?.use { cursor ->
                    if (cursor.moveToFirst()) {
                        val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                        if (nameIndex != -1) {
                            fileName = cursor.getString(nameIndex)
                        }
                    }
                }
            }

            if (fileName.isNullOrEmpty()) {
                fileName = uri.lastPathSegment ?: "file_${System.currentTimeMillis()}"
            }

            val safeFile = File(cacheDir, fileName)
            try {
                contentResolver.openInputStream(uri)?.use { input ->
                    FileOutputStream(safeFile).use { output ->
                        input.copyTo(output)
                    }
                }
                paths.add(safeFile.absolutePath)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
        return paths
    }

    private fun injectTauriShim() {
        val shimScript = """
            (function() {
                if (window.__TAURI_INTERNALS__) return;
                
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
