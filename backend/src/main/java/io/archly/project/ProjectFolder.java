package io.archly.project;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "project_folders")
public class ProjectFolder {
    @Id private UUID id;
    @Column(nullable = false) private String ownerEmail;
    @Column(nullable = false, length = 80) private String name;
    @Column(nullable = false) private Instant createdAt;

    protected ProjectFolder() {}

    public ProjectFolder(String ownerEmail, String name) {
        this.id = UUID.randomUUID();
        this.ownerEmail = ownerEmail;
        this.name = name;
        this.createdAt = Instant.now();
    }

    public String getName() { return name; }
}
