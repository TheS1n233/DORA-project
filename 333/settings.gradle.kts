// dora/333/settings.gradle.kts
pluginManagement {
    repositories {
        gradlePluginPortal()
        google()
        mavenCentral()
        maven("https://jitpack.io")
        // Optional: public mirror for China network
        maven { url = uri("https://maven.aliyun.com/repository/public") } // mirror only; keep after mavenCentral
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
        maven("https://jitpack.io")
        // Optional: public mirror for China network
        maven { url = uri("https://maven.aliyun.com/repository/public") } // mirror only; keep after mavenCentral
    }
}

rootProject.name = "333"
include(":app")
