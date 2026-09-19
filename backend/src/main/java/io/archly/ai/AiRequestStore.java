package io.archly.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.archly.ai.DiagramGenerationDtos.GenerateDiagramResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.Duration;
import java.util.HexFormat;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
class AiRequestStore {
    record Claim(String id, String state, GenerateDiagramResponse result, Integer status, String message) {
        boolean owned() { return state.equals("NEW"); }
    }
    private final JdbcTemplate jdbc;
    private final AiRateLimitLockRepository locks;
    private final ApiKeyCipher cipher;
    private final ObjectMapper mapper;
    private final Duration ttl;
    AiRequestStore(JdbcTemplate jdbc, AiRateLimitLockRepository locks, ApiKeyCipher cipher, ObjectMapper mapper,
                   @Value("${archly.ai.replay-retention:24h}") Duration ttl) {
        this.jdbc = jdbc; this.locks = locks; this.cipher = cipher; this.mapper = mapper; this.ttl = ttl;
        if (ttl.compareTo(Duration.ofMinutes(2)) < 0 || ttl.compareTo(Duration.ofDays(7)) > 0) throw new IllegalArgumentException("AI replay retention must be between two minutes and seven days.");
    }
    static String hash(String text) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8))); }
        catch (Exception exception) { throw new IllegalStateException("SHA-256 unavailable"); }
    }
    @Transactional
    Claim begin(String user, String key, String fingerprint, Duration deadline) {
        locks.acquire(0);
        String id = hash(user + "\0" + key);
        Claim existing = read(user, id, fingerprint);
        if (existing != null) return existing;
        if (jdbc.queryForObject("select count(*) from ai_generation_requests", Long.class) >= 10_000
            || jdbc.queryForObject("select count(*) from ai_generation_requests where user_subject=?", Long.class, user) >= 1000)
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "AI replay storage is full. Try again after its retention window.");
        Instant now = Instant.now();
        jdbc.update("insert into ai_generation_requests (request_id,user_subject,fingerprint,state,lease_until,expires_at) values (?,?,?,'IN_PROGRESS',?,?)",
            id, user, fingerprint, Timestamp.from(now.plus(deadline).plusSeconds(10)), Timestamp.from(now.plus(ttl)));
        return new Claim(id, "NEW", null, null, null);
    }
    @Transactional(readOnly = true)
    Claim read(String user, String id, String fingerprint) {
        var rows = jdbc.query("select * from ai_generation_requests where request_id=? and user_subject=?", (rs, index) -> {
            if (!rs.getString("fingerprint").equals(fingerprint)) throw new ResponseStatusException(HttpStatus.CONFLICT, "This idempotency key was used with different input. Use a new key.");
            String state = rs.getString("state");
            if (rs.getTimestamp("expires_at").toInstant().isBefore(Instant.now()) || state.equals("IN_PROGRESS") && rs.getTimestamp("lease_until").toInstant().isBefore(Instant.now()))
                return new Claim(id, "FAILED", null, 410, "This AI request expired. Submit a new request key.");
            GenerateDiagramResponse result = null;
            if (state.equals("COMPLETED")) try {
                result = mapper.readValue(cipher.decrypt(rs.getString("encrypted_result"), user, "AI_RESULT:" + id, rs.getInt("encryption_key_version")), GenerateDiagramResponse.class);
            } catch (Exception exception) { throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "The stored AI result could not be read."); }
            return new Claim(id, state, result, (Integer) rs.getObject("failure_status"), rs.getString("failure_message"));
        }, id, user);
        return rows.isEmpty() ? null : rows.get(0);
    }
    @Transactional
    void complete(String user, String id, GenerateDiagramResponse result) {
        try {
            String serialized = mapper.writeValueAsString(result);
            if (serialized.length() > 1_000_000) throw new IllegalArgumentException();
            String encrypted = cipher.encrypt(serialized, user, "AI_RESULT:" + id);
            if (jdbc.update("update ai_generation_requests set state='COMPLETED',encrypted_result=?,encryption_key_version=? where request_id=? and user_subject=? and state='IN_PROGRESS'",
                encrypted, cipher.currentVersion(), id, user) != 1) throw new IllegalStateException();
        } catch (Exception exception) { throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "The AI result could not be stored for replay."); }
    }
    @Transactional
    void fail(String user, String id, ResponseStatusException failure) {
        jdbc.update("update ai_generation_requests set state='FAILED',failure_status=?,failure_message=? where request_id=? and user_subject=? and state='IN_PROGRESS'",
            failure.getStatusCode().value(), failure.getReason(), id, user);
    }
    @Scheduled(fixedDelayString = "${archly.ai.replay-cleanup-ms:60000}")
    @Transactional
    void cleanup() { jdbc.update("delete from ai_generation_requests where expires_at<?", Timestamp.from(Instant.now())); }
    @EventListener
    @Transactional
    void accountDeleted(AccountDeletedEvent event) { jdbc.update("delete from ai_generation_requests where user_subject=?", event.userSubject()); }
}
