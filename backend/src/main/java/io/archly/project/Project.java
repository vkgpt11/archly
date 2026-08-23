package io.archly.project;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "projects")
public class Project {
    @Id
    private UUID id;
    @Column(nullable = false)
    private String ownerEmail;
    @Column(nullable = false, length = 120)
    private String name;
    @Column(nullable = false, columnDefinition = "text")
    private String canvasJson;
    @Column(nullable = false, columnDefinition = "text")
    private String markdown;
    @Version
    private long revision;
    @Column(nullable = false)
    private Instant createdAt;
    @Column(nullable = false)
    private Instant updatedAt;

    protected Project() {}

    public Project(String ownerEmail, String name) {
        this.id = UUID.randomUUID();
        this.ownerEmail = ownerEmail;
        this.name = name;
        this.canvasJson = "{\"nodes\":[],\"edges\":[]}";
        this.markdown = "<h1>" + escapeHtml(name) + "</h1><p>Describe your architecture here.</p>";
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    public void update(String name, String canvasJson, String markdown) {
        this.name = name;
        this.canvasJson = canvasJson;
        this.markdown = markdown;
        this.updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public String getOwnerEmail() { return ownerEmail; }
    public String getName() { return name; }
    public String getCanvasJson() { return canvasJson; }
    public String getMarkdown() { return markdown; }
    public long getRevision() { return revision; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    private static String escapeHtml(String value) {
        return value.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;")
            .replace("'", "&#39;");
    }
}
