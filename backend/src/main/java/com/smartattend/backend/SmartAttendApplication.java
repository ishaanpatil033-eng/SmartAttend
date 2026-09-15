package com.smartattend.backend;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.ApplicationContextInitializer;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.env.Environment;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Arrays;

@SpringBootApplication
public class SmartAttendApplication {

    private static final Logger logger = LoggerFactory.getLogger(SmartAttendApplication.class);

    public static void main(String[] args) {
        SpringApplication app = new SpringApplication(SmartAttendApplication.class);
        app.addInitializers(new ApplicationContextInitializer<ConfigurableApplicationContext>() {
            @Override
            public void initialize(ConfigurableApplicationContext context) {
                Environment env = context.getEnvironment();
                boolean isProd = Arrays.asList(env.getActiveProfiles()).contains("prod");
                if (isProd) {
                    String dbPass = env.getProperty("spring.datasource.password");
                    if (dbPass == null || dbPass.trim().isEmpty()) {
                        Path secretPath = Paths.get("/run/secrets/db_password");
                        if (Files.exists(secretPath)) {
                            try {
                                String filePass = Files.readString(secretPath).trim();
                                if (!filePass.isEmpty()) {
                                    System.setProperty("spring.datasource.password", filePass);
                                    dbPass = filePass;
                                    logger.info("Loaded production database password securely from secret file.");
                                }
                            } catch (Exception e) {
                                logger.warn("Could not read database secret password from /run/secrets/db_password: {}", e.getMessage());
                            }
                        }
                    }

                    if (dbPass == null || dbPass.trim().isEmpty()) {
                        logger.error("PRODUCTION SECURITY FAILURE: Required database password ('SPRING_DATASOURCE_PASSWORD' or secret file) is missing or blank. Application startup aborted.");
                        throw new IllegalStateException("FATAL: Required production secret 'SPRING_DATASOURCE_PASSWORD' is missing or blank. Application cannot start with unconfigured credentials.");
                    }

                    String dbUser = env.getProperty("spring.datasource.username");
                    if (dbUser == null || dbUser.trim().isEmpty()) {
                        logger.error("PRODUCTION SECURITY FAILURE: Required database username ('SPRING_DATASOURCE_USERNAME') is missing or blank. Application startup aborted.");
                        throw new IllegalStateException("FATAL: Required production setting 'SPRING_DATASOURCE_USERNAME' is missing or blank.");
                    }

                    String dbUrl = env.getProperty("spring.datasource.url");
                    if (dbUrl == null || dbUrl.trim().isEmpty()) {
                        logger.error("PRODUCTION SECURITY FAILURE: Required database URL ('SPRING_DATASOURCE_URL') is missing or blank. Application startup aborted.");
                        throw new IllegalStateException("FATAL: Required production setting 'SPRING_DATASOURCE_URL' is missing or blank.");
                    }
                }
            }
        });
        app.run(args);
    }
}
