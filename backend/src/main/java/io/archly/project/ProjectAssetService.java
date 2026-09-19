package io.archly.project;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ProjectAssetService {
    static final Pattern REFERENCE=Pattern.compile("archly-asset:([0-9a-fA-F-]{36})");
    static final Pattern EMBEDDED=Pattern.compile("data:image/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+",Pattern.CASE_INSENSITIVE);
    public record Content(String canvasJson,String markdown) {}
    public record ManifestAsset(UUID id,String mediaType,String base64) {}
    public record AssetView(UUID id,String reference,String mediaType,long byteSize,int width,int height) {}
    private final AssetCatalog catalog;
    private final AssetObjectStore store;
    private final AssetImageValidator validator;
    private final ProjectRepository projects;
    private final ProjectShareRepository shares;
    private final ObjectMapper mapper;
    private final Duration retention;
    ProjectAssetService(AssetCatalog catalog,AssetObjectStore store,AssetImageValidator validator,ProjectRepository projects,
        ProjectShareRepository shares,ObjectMapper mapper,@Value("${archly.assets.retention:7d}")Duration retention){
        this.catalog=catalog;this.store=store;this.validator=validator;this.projects=projects;this.shares=shares;this.mapper=mapper;this.retention=retention;
        if(retention.compareTo(Duration.ofDays(7))<0)throw new IllegalArgumentException("Asset retention must be at least seven days to preserve drafts and undo.");
    }
    Project owned(String email,UUID id){return projects.findByIdAndOwnerEmail(id,email).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Project not found."));}
    @Transactional(readOnly=true)
    Project shared(String token,boolean write){
        try{
            String hash=HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8)));
            var share=shares.findByTokenHashAndRevokedFalse(hash).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Share unavailable."));
            if(share.isExpired())throw new ResponseStatusException(HttpStatus.GONE,"Share expired.");
            if("EMBED".equals(share.getPermission()))throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Share unavailable.");
            if(write && !"EDIT".equals(share.getPermission()))throw new ResponseStatusException(HttpStatus.FORBIDDEN,"This share is read-only.");
            var project=share.getProject();project.getMarkdown();return project;
        }catch(ResponseStatusException failure){throw failure;}catch(Exception failure){throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Share unavailable.");}
    }
    AssetView upload(Project project,String creator,byte[] bytes,String type){
        var image=validator.validate(bytes,type);
        var asset=catalog.reserve(project,creator,image,bytes.length);
        // Reservation is durable before the object write. Failed/rolled-back work is collected after retention.
        store.put(asset.key(),image.type(),bytes);catalog.uploaded(asset.id());
        return new AssetView(asset.id(),asset.reference(),image.type(),bytes.length,image.width(),image.height());
    }
    byte[] read(Project project,UUID id,boolean publicRead){
        var asset=catalog.get(project.getId(),id);
        if(!asset.state().equals("UPLOADED"))throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Image unavailable.");
        if(publicRead && !publicReferences(project).contains(id))throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Image unavailable.");
        return store.get(asset.key());
    }
    String mediaType(Project project,UUID id){return catalog.get(project.getId(),id).type();}
    public static Set<UUID> references(String canvas,String markdown){
        Set<UUID> ids=new HashSet<>();var matches=REFERENCE.matcher(canvas+"\n"+Objects.toString(markdown,""));
        while(matches.find())try{ids.add(UUID.fromString(matches.group(1)));}catch(IllegalArgumentException bad){throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid image reference.");}
        return ids;
    }
    private Set<UUID> publicReferences(Project project){
        try{var canvas=mapper.readTree(project.getCanvasJson()).deepCopy();((com.fasterxml.jackson.databind.node.ObjectNode)canvas).remove("diagramSnapshots");return references(canvas.toString(),project.getMarkdown());}
        catch(Exception bad){throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid project canvas.");}
    }
    @Transactional
    public void validateReferences(Project project,String canvas,String markdown){
        catalog.lock();
        for(UUID id:references(canvas,markdown))if(!catalog.get(project.getId(),id).state().equals("UPLOADED"))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Upload the image before saving.");
    }
    @Transactional
    public void reconcile(Project project){
        catalog.lock();Set<UUID> refs=references(project.getCanvasJson(),project.getMarkdown());
        for(var asset:catalog.list("where project_id=?",project.getId())){
            if(refs.contains(asset.id()))catalog.jdbc.update("update project_assets set unreferenced_at=null where id=?",asset.id());
            else catalog.jdbc.update("update project_assets set unreferenced_at=coalesce(unreferenced_at,?) where id=?",Timestamp.from(Instant.now()),asset.id());
        }
    }
    public Content copy(Project source,Project target,String canvas,String markdown){
        Map<String,String> replacements=new LinkedHashMap<>();
        for(UUID id:references(canvas,markdown)){
            var asset=catalog.get(source.getId(),id);
            var copy=upload(target,target.getOwnerEmail(),store.get(asset.key()),asset.type());
            replacements.put("archly-asset:"+id,copy.reference());
        }
        return replace(canvas,markdown,replacements);
    }
    public void validateManifest(int version,String canvas,String markdown,List<ManifestAsset> assets){
        List<ManifestAsset> manifest=assets==null?List.of():assets;
        if(manifest.size()>1000 || version==1 && !manifest.isEmpty())throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid image manifest.");
        Set<UUID> ids=new HashSet<>();
        for(var asset:manifest){
            if(asset==null || asset.id()==null || asset.base64()==null || asset.base64().length()>2_666_668 || !ids.add(asset.id()))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid or duplicate packaged image.");
            validator.validate(decode(asset.base64()),asset.mediaType());
        }
        if(!ids.equals(references(canvas,markdown)))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"The backup must include every referenced image and no unrelated images.");
    }
    public Content importAssets(Project target,String canvas,String markdown,List<ManifestAsset> assets){
        Map<String,String> replacements=new LinkedHashMap<>();
        for(var asset:assets==null?List.<ManifestAsset>of():assets){
            var uploaded=upload(target,target.getOwnerEmail(),decode(asset.base64()),asset.mediaType());
            replacements.put("archly-asset:"+asset.id(),uploaded.reference());
        }
        return replace(canvas,markdown,replacements);
    }
    static Content replace(String canvas,String markdown,Map<String,String> replacements){
        String document=Objects.toString(markdown,"");
        for(var entry:replacements.entrySet()){canvas=canvas.replace(entry.getKey(),entry.getValue());document=document.replace(entry.getKey(),entry.getValue());}
        return new Content(canvas,document);
    }
    private byte[] decode(String base64){try{return Base64.getDecoder().decode(base64);}catch(IllegalArgumentException invalid){throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid image encoding.");}}
    public Map<String,byte[]> embedded(String canvas,String markdown,int limit){
        Map<String,byte[]> result=new LinkedHashMap<>();var matcher=EMBEDDED.matcher(canvas+"\n"+Objects.toString(markdown,""));
        while(matcher.find() && result.size()<limit){String value=matcher.group();result.putIfAbsent(value,decode(value.substring(value.indexOf(',')+1)));}return result;
    }
    public Content migrate(Project project,int batch){
        Map<String,String> replacements=new LinkedHashMap<>();
        for(var entry:embedded(project.getCanvasJson(),project.getMarkdown(),batch).entrySet()){
            String type=entry.getKey().substring(5,entry.getKey().indexOf(';'));
            replacements.put(entry.getKey(),upload(project,project.getOwnerEmail(),entry.getValue(),type).reference());
        }
        return replace(project.getCanvasJson(),project.getMarkdown(),replacements);
    }
    @Scheduled(fixedDelayString="${archly.assets.cleanup-ms:3600000}")
    @Transactional
    public void cleanup(){
        catalog.lock();
        var candidates=catalog.list("where unreferenced_at is null or unreferenced_at<? order by last_checked_at limit 100",Timestamp.from(Instant.now().minus(retention)));
        for(var asset:candidates){
            catalog.jdbc.update("update project_assets set last_checked_at=? where id=?",Timestamp.from(Instant.now()),asset.id());
            var project=projects.findById(asset.projectId());
            if(project.isPresent() && references(project.get().getCanvasJson(),project.get().getMarkdown()).contains(asset.id()))continue;
            int marked=catalog.jdbc.update("update project_assets set unreferenced_at=? where id=? and unreferenced_at is null",Timestamp.from(Instant.now()),asset.id());
            if(marked>0)continue;
            try{store.delete(asset.key());catalog.jdbc.update("delete from project_assets where id=?",asset.id());}catch(ResponseStatusException unavailable){/* Retry the retained metadata on the next run. */}
        }
    }
}
