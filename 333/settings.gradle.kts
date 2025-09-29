// dora/333/settings.gradle.kts
pluginManagement {
    repositories {
        gradlePluginPortal()
        google()
        mavenCentral()
        maven("https://jitpack.io")
        maven("https://maven.livekit.io")
    }
}

dependencyResolutionManagement {
    // Keep FAIL_ON_PROJECT_REPOS to ensure repositories here take effect
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
        maven("https://jitpack.io")
        maven("https://maven.livekit.io")
    }
}

rootProject.name = "333"
include(":app")
