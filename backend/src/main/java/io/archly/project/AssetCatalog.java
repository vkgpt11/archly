package io.archly.project;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@Service
class AssetCatalog {
    record Asset(UUID id,UUID projectId,String owner,String key,String type,long size,int width,int height,String hash,String state) {
        public String reference(){return "archly-asset:"+id;}
    }
    final JdbcTemplate jdbc;
    private final long projectQuota,userQuota;
    AssetCatalog(JdbcTemplate jdbc,@Value("${archly.assets.project-quota-bytes:20000000}")long projectQuota,
        @Value("${archly.assets.user-quota-bytes:100000000}")long userQuota){this.jdbc=jdbc;this.projectQuota=projectQuota;this.userQuota=userQuota;}
    void lock(){jdbc.queryForObject("select id from project_asset_locks where id=0 for update",Integer.class);}
    @Transactional(propagation=Propagation.REQUIRES_NEW)
    Asset reserve(Project project,String creator,AssetImageValidator.Image image,int bytes) {
        lock();
        long projectBytes=jdbc.queryForObject("select coalesce(sum(byte_size),0) from project_assets where project_id=?",Long.class,project.getId());
        long userBytes=jdbc.queryForObject("select coalesce(sum(byte_size),0) from project_assets where owner_email=?",Long.class,project.getOwnerEmail());
        if(bytes>projectQuota-projectBytes || bytes>userQuota-userBytes)throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE,"Image storage quota exceeded. Retained images count until their recovery period ends.");
        if(jdbc.queryForObject("select count(*) from project_assets where project_id=?",Integer.class,project.getId())>=1000)throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE,"Project image count limit reached.");
        UUID id=UUID.randomUUID();String key="projects/"+project.getId()+"/"+id;
        Timestamp now=Timestamp.from(Instant.now());
        jdbc.update("insert into project_assets(id,project_id,owner_email,owner_user_id,creator,storage_key,media_type,byte_size,pixel_width,pixel_height,content_hash,state,created_at,unreferenced_at) values (?,?,?,?,?,?,?,?,?,?,?,'PENDING',?,?)",
            id,project.getId(),project.getOwnerEmail(),project.getOwnerUserId(),creator,key,image.type(),bytes,image.width(),image.height(),image.hash(),now,now);
        return new Asset(id,project.getId(),project.getOwnerEmail(),key,image.type(),bytes,image.width(),image.height(),image.hash(),"PENDING");
    }
    @Transactional(propagation=Propagation.REQUIRES_NEW)
    void uploaded(UUID id){jdbc.update("update project_assets set state='UPLOADED' where id=?",id);}
    Asset get(UUID project,UUID id){return list("where project_id=? and id=?",project,id).stream().findFirst().orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Image not found."));}
    List<Asset> list(String where,Object...args){return jdbc.query("select * from project_assets "+where,(rs,n)->new Asset(rs.getObject("id",UUID.class),rs.getObject("project_id",UUID.class),rs.getString("owner_email"),rs.getString("storage_key"),rs.getString("media_type"),rs.getLong("byte_size"),rs.getInt("pixel_width"),rs.getInt("pixel_height"),rs.getString("content_hash"),rs.getString("state")),args);}
}
