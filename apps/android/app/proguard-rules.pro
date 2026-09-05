# Proguard rules for Recast Android

# Keep models for Gson serialization/deserialization
-keepclassmembers class io.github.imustacho.recast.model.** { <fields>; }
-keep class io.github.imustacho.recast.model.** { *; }

# Keep JavascriptInterface methods
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# FFmpegKit
-keep class com.arthenica.ffmpegkit.** { *; }

# PDFBox Android
-keep class com.tom_roush.pdfbox.** { *; }
