package io.archly.project;

import java.util.UUID;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;

@RestController
public class ProjectAssetController {
    private final ProjectAssetService service;
    ProjectAssetController(ProjectAssetService service){this.service=service;}
    @PostMapping("/api/projects/{project}/assets")
    @ResponseStatus(HttpStatus.CREATED)
    ProjectAssetService.AssetView upload(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID project,@RequestHeader("Content-Type")String type,@RequestBody byte[] bytes){return service.upload(service.owned(jwt.getClaimAsString("email"),project),jwt.getSubject(),bytes,type);}
    @GetMapping("/api/projects/{project}/assets/{asset}")
    ResponseEntity<byte[]> read(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID project,@PathVariable UUID asset){return image(service.owned(jwt.getClaimAsString("email"),project),asset,false);}
    @PostMapping("/api/shares/{token}/assets")
    @ResponseStatus(HttpStatus.CREATED)
    ProjectAssetService.AssetView uploadShared(@PathVariable String token,@RequestHeader("Content-Type")String type,@RequestBody byte[] bytes){return service.upload(service.shared(token,true),"shared-editor",bytes,type);}
    @GetMapping("/api/shares/{token}/assets/{asset}")
    ResponseEntity<byte[]> readShared(@PathVariable String token,@PathVariable UUID asset){var project=service.shared(token,false);boolean readOnly=true;try{service.shared(token,true);readOnly=false;}catch(org.springframework.web.server.ResponseStatusException forbidden){if(forbidden.getStatusCode().value()!=403)throw forbidden;}return image(project,asset,readOnly);}
    private ResponseEntity<byte[]> image(Project project,UUID id,boolean shared){return ResponseEntity.ok().contentType(MediaType.parseMediaType(service.mediaType(project,id)))
        .cacheControl(CacheControl.noStore()).header("X-Content-Type-Options","nosniff").header("Content-Disposition","inline").body(service.read(project,id,shared));}
}
