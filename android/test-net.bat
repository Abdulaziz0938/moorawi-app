@echo off
echo === Test 1: Google Maven (Android Plugin) ===
curl -I -m 15 https://dl.google.com/dl/android/maven2/com/android/tools/build/gradle/8.2.2/gradle-8.2.2.pom

echo.
echo === Test 2: Tencent Gradle Mirror ===
curl -I -m 15 https://mirrors.cloud.tencent.com/gradle/gradle-8.2.1-bin.zip

echo.
echo === Test 3: Aliyun Maven ===
curl -I -m 15 https://maven.aliyun.com/repository/public/junit/junit/4.13.2/junit-4.13.2.pom

echo.
echo === Test 4: Official Gradle ===
curl -I -m 15 https://services.gradle.org/distributions/gradle-8.2.1-bin.zip

echo.
pause