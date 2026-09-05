plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "io.github.imustacho.recast"
    compileSdk = 35

    defaultConfig {
        applicationId = "io.github.imustacho.recast"
        minSdk = 24
        targetSdk = 35
        versionCode = 2
        versionName = "0.2.2"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    signingConfigs {
        create("release") {
            val keystoreFile = file("release.keystore")
            if (keystoreFile.exists()) {
                storeFile = keystoreFile
                storePassword = System.getenv("KEYSTORE_PASSWORD") ?: "recastandroid"
                keyAlias = System.getenv("KEY_ALIAS") ?: "recast"
                keyPassword = System.getenv("KEY_PASSWORD") ?: "recastandroid"
            } else {
                initWith(getByName("debug"))
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("release")
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
        debug {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    lint {
        checkReleaseBuilds = false
        abortOnError = false
    }

    sourceSets {
        getByName("main") {
            assets.srcDirs("src/main/assets")
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.webkit:webkit:1.12.1")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0")
    implementation("com.google.code.gson:gson:2.11.0")

    // FFmpegKit (maintained community fork with 16KB page and SDK 35 support)
    implementation("dev.ffmpegkit-maintained:ffmpeg-kit-full:8.1.7")

    // Document Engine: PDFBox Android for PDF manipulation and text extraction
    implementation("com.tom-roush:pdfbox-android:2.0.27.0")

    // Document Engine: Markdown to HTML parser and renderer
    implementation("org.commonmark:commonmark:0.22.0")

    // Document Engine: HTML parsing, text stripping
    implementation("org.jsoup:jsoup:1.18.1")

    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.2.1")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.6.1")
}
