package io.archly.project;

import com.google.auth.oauth2.GoogleCredentials;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/** Private Firebase/GCS bucket access or isolated local filesystem storage. */
@Component
class AssetObjectStore {
    private final String mode, bucket;
    private final Path root;
    private final HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    AssetObjectStore(@Value("${archly.assets.store:local}") String mode,
        @Value("${archly.assets.firebase-bucket:}") String bucket,
        @Value("${archly.assets.local-root:./data/assets}") String root, Environment environment) {
        this.mode=mode; this.bucket=bucket; this.root=Path.of(root).toAbsolutePath().normalize();
        if (!mode.equals("local") && !mode.equals("firebase")) throw new IllegalArgumentException("Asset store must be local or firebase.");
        if (environment.matchesProfiles("prod","production") && !mode.equals("firebase")) throw new IllegalArgumentException("Production requires Firebase asset storage.");
        if (mode.equals("firebase") && !bucket.matches("[a-z0-9][a-z0-9._-]{2,221}")) throw new IllegalArgumentException("Configure the Firebase storage bucket name.");
    }
    void put(String key, String type, byte[] bytes) {
        try {
            if (mode.equals("local")) {
                Path path=path(key); Files.createDirectories(path.getParent());
                Files.write(path,bytes,java.nio.file.StandardOpenOption.CREATE_NEW); return;
            }
            var response=client.send(request("https://storage.googleapis.com/upload/storage/v1/b/"+bucket+"/o?uploadType=media&ifGenerationMatch=0&name="+encode(key))
                .header("Content-Type",type).POST(HttpRequest.BodyPublishers.ofByteArray(bytes)).build(),HttpResponse.BodyHandlers.discarding());
            if (response.statusCode()/100 != 2) throw unavailable();
        } catch (Exception exception) { if(exception instanceof InterruptedException)Thread.currentThread().interrupt(); throw unavailable(); }
    }
    byte[] get(String key) {
        try {
            if(mode.equals("local")) return Files.readAllBytes(path(key));
            var response=client.send(request(objectUrl(key)+"?alt=media").GET().build(),HttpResponse.BodyHandlers.ofInputStream());
            try(var stream=response.body()) {
                if(response.statusCode()!=200)throw unavailable();
                byte[] bytes=stream.readNBytes(2_000_001);if(bytes.length>2_000_000)throw unavailable();return bytes;
            }
        } catch(Exception exception){if(exception instanceof InterruptedException)Thread.currentThread().interrupt();throw unavailable();}
    }
    void delete(String key) {
        try {
            if(mode.equals("local")){Files.deleteIfExists(path(key));return;}
            int status=client.send(request(objectUrl(key)).DELETE().build(),HttpResponse.BodyHandlers.discarding()).statusCode();
            if(status/100!=2 && status!=404)throw unavailable();
        }catch(Exception exception){if(exception instanceof InterruptedException)Thread.currentThread().interrupt();throw unavailable();}
    }
    private Path path(String key){Path result=root.resolve(key).normalize();if(!result.startsWith(root))throw unavailable();return result;}
    private String objectUrl(String key){return "https://storage.googleapis.com/storage/v1/b/"+bucket+"/o/"+encode(key);}
    private String encode(String text){return URLEncoder.encode(text,StandardCharsets.UTF_8);}
    private HttpRequest.Builder request(String url) throws java.io.IOException {
        var credentials=GoogleCredentials.getApplicationDefault().createScoped("https://www.googleapis.com/auth/devstorage.read_write");
        credentials.refreshIfExpired();
        return HttpRequest.newBuilder(URI.create(url)).timeout(Duration.ofSeconds(15)).header("Authorization","Bearer "+credentials.getAccessToken().getTokenValue());
    }
    private ResponseStatusException unavailable(){return new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Image storage is unavailable. Try again.");}
}
