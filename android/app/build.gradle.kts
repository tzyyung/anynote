import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val localProps = Properties().apply {
    val f = rootProject.file("local.properties")
    if (f.exists()) f.inputStream().use { load(it) }
}
val anynoteUrl: String = localProps.getProperty("ANYNOTE_URL") ?: ""
val anynoteSecret: String = localProps.getProperty("ANYNOTE_SECRET") ?: ""

android {
    namespace = "com.aidaris.anynote"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.aidaris.anynote"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "0.1"
        buildConfigField("String", "ANYNOTE_URL", "\"$anynoteUrl\"")
        buildConfigField("String", "ANYNOTE_SECRET", "\"$anynoteSecret\"")
    }

    buildFeatures {
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.activity:activity-ktx:1.9.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")
}
