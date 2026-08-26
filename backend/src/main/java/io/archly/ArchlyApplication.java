package io.archly;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class ArchlyApplication {
    public static void main(String[] args) {
        SpringApplication.run(ArchlyApplication.class, args);
    }
}
