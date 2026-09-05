package io.github.imustacho.recast.bridge

import android.webkit.JavascriptInterface
import android.webkit.WebView
import com.google.gson.Gson
import com.google.gson.JsonObject
import io.github.imustacho.recast.MainActivity
import io.github.imustacho.recast.engine.ConversionEngine
import io.github.imustacho.recast.engine.FormatRegistry
import io.github.imustacho.recast.model.*
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.io.File
import java.text.SimpleDateFormat
import java.util.*

class TauriBridge(
    private val activity: MainActivity,
    private val webView: WebView
) {
    private val gson = Gson()
    private val scope = CoroutineScope(Dispatchers.Main)
    private val conversionEngine = ConversionEngine(activity)

    @JavascriptInterface
    fun invoke(cmd: String, argsJson: String, callbackId: String) {
        scope.launch(Dispatchers.IO) {
            try {
                when (cmd) {
                    "get_conversion_capabilities" -> {
                        val caps = FormatRegistry.getCapabilities()
                        postSuccess(callbackId, gson.toJson(caps))
                    }

                    "get_engine_status" -> {
                        val status = EngineStatus(
                            ffmpeg = true,
                            libreoffice = true,
                            libreofficeVersion = "Android Document Engine (PdfBox/CommonMark/Jsoup)"
                        )
                        postSuccess(callbackId, gson.toJson(status))
                    }

                    "inspect_files" -> {
                        val json = gson.fromJson(argsJson, JsonObject::class.java)
                        val paths = json.getAsJsonArray("paths")?.map { it.asString } ?: emptyList()
                        val list = paths.map { path ->
                            val formatDef = FormatRegistry.detectFormat(path)
                            UiMediaFile(
                                path = path,
                                detectedFormat = formatDef?.id ?: File(path).extension.ifEmpty { "unknown" },
                                category = formatDef?.category ?: "unknown"
                            )
                        }
                        postSuccess(callbackId, gson.toJson(list))
                    }

                    "queue_conversion" -> {
                        val json = gson.fromJson(argsJson, JsonObject::class.java)
                        val requestJson = json.getAsJsonObject("request")
                        val request = gson.fromJson(requestJson, ConversionRequest::class.java)

                        val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
                        isoFormat.timeZone = TimeZone.getTimeZone("UTC")
                        val now = isoFormat.format(Date())

                        val jobs = request.inputPaths.map { input ->
                            val formatDef = FormatRegistry.detectFormat(input)
                            ConversionJob(
                                id = UUID.randomUUID().toString(),
                                inputPath = input,
                                outputPath = null,
                                sourceFormat = formatDef?.id ?: File(input).extension,
                                targetFormat = request.targetFormat,
                                presetId = request.presetId,
                                status = "ready",
                                progress = 0,
                                currentStep = null,
                                createdAt = now
                            )
                        }
                        postSuccess(callbackId, gson.toJson(jobs))
                    }

                    "convert_files" -> {
                        val json = gson.fromJson(argsJson, JsonObject::class.java)
                        val requestJson = json.getAsJsonObject("request")
                        val request = gson.fromJson(requestJson, ConversionRequest::class.java)

                        val results = conversionEngine.convertFiles(request)
                        postSuccess(callbackId, gson.toJson(results))
                    }

                    "get_launch_request" -> {
                        val launchRequest = activity.getPendingLaunchRequest()
                        postSuccess(callbackId, gson.toJson(launchRequest))
                    }

                    "plugin:dialog|open" -> {
                        activity.launchFilePicker(callbackId)
                    }

                    "plugin:opener|reveal_item_in_dir", "plugin:opener|open_path" -> {
                        val json = gson.fromJson(argsJson, JsonObject::class.java)
                        val path = when {
                            json.has("path") -> json.get("path").asString
                            json.has("paths") -> json.getAsJsonArray("paths").firstOrNull()?.asString
                            else -> null
                        }
                        if (!path.isNullOrEmpty()) {
                            activity.openFile(path)
                        }
                        postSuccess(callbackId, "null")
                    }

                    "open_external_url", "plugin:opener|open_url" -> {
                        val json = gson.fromJson(argsJson, JsonObject::class.java)
                        val url = json.get("url")?.asString
                        if (!url.isNullOrEmpty()) {
                            activity.openWebUrl(url)
                        }
                        postSuccess(callbackId, "null")
                    }

                    "install_libreoffice" -> {
                        postSuccess(callbackId, gson.toJson("Android document engine is already integrated."))
                    }

                    else -> {
                        // Return empty object for unsupported non-critical commands
                        postSuccess(callbackId, "{}")
                    }
                }
            } catch (e: Exception) {
                postError(callbackId, e.message ?: "Execution failed")
            }
        }
    }

    fun postSuccess(callbackId: String, resultJson: String) {
        activity.runOnUiThread {
            val script = "if (window.__recast_callbacks && window.__recast_callbacks['$callbackId']) { " +
                    "window.__recast_callbacks['$callbackId'].resolve($resultJson); " +
                    "delete window.__recast_callbacks['$callbackId']; }"
            webView.evaluateJavascript(script, null)
        }
    }

    fun postError(callbackId: String, errorMsg: String) {
        activity.runOnUiThread {
            val escapedError = gson.toJson(errorMsg)
            val script = "if (window.__recast_callbacks && window.__recast_callbacks['$callbackId']) { " +
                    "window.__recast_callbacks['$callbackId'].reject(new Error($escapedError)); " +
                    "delete window.__recast_callbacks['$callbackId']; }"
            webView.evaluateJavascript(script, null)
        }
    }
}
