package io.archly.ai;
import static org.assertj.core.api.Assertions.assertThat;
import java.nio.file.*;import java.util.List;import java.util.regex.Pattern;import org.junit.jupiter.api.Test;
class SecretLeakTest {
 private static final List<Pattern> PATTERNS=List.of(Pattern.compile("sk-[A-Za-z0-9_-]{20,}"),Pattern.compile("-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),Pattern.compile("AIza[0-9A-Za-z_-]{30,}"));
 @Test void repositoryContainsNoCommittedProviderSecrets() throws Exception {Path root=Path.of("..").toAbsolutePath().normalize();Process process=new ProcessBuilder("git","ls-files","-z").directory(root.toFile()).start();String listed=new String(process.getInputStream().readAllBytes());assertThat(process.waitFor()).isZero();for(String name:listed.split("\0")){Path file=root.resolve(name);if(name.endsWith("SecretLeakTest.java")||name.startsWith("ui/dist/")||!Files.isRegularFile(file)||Files.size(file)>2_000_000)continue;String text;try{text=Files.readString(file);}catch(Exception ignored){continue;}for(Pattern pattern:PATTERNS)assertThat(pattern.matcher(text).find()).as("secret-like value in %s",name).isFalse();}}
}
