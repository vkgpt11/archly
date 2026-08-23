@ECHO OFF
SETLOCAL
SET "WRAPPER_JAR=%~dp0.mvn\wrapper\maven-wrapper.jar"
java -Dmaven.multiModuleProjectDirectory="%~dp0." -classpath "%WRAPPER_JAR%" org.apache.maven.wrapper.MavenWrapperMain %*
ENDLOCAL
