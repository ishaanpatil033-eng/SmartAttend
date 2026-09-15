# ===================================================================
# SmartAttend Backend — Production Multi-Stage Dockerfile
# Stage 1: Build executable JAR using Maven and Temurin JDK 21
# Stage 2: Minimal hardened Alpine Temurin JRE 21 runtime container
# ===================================================================

# -------------------------------------------------------------------
# Stage 1: Build Artifact
# -------------------------------------------------------------------
FROM maven:3.9.9-eclipse-temurin-21-alpine AS builder
WORKDIR /build

# Pre-fetch Maven dependencies for caching efficiency
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source code and package executable production archive
COPY src ./src
RUN mvn clean package -DskipTests -B

# -------------------------------------------------------------------
# Stage 2: Hardened Runtime Container
# -------------------------------------------------------------------
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Non-root user setup for container security
RUN addgroup -S smartattend && adduser -S smartattend -G smartattend && \
    mkdir -p /app/uploads && chown -R smartattend:smartattend /app
USER smartattend:smartattend

# Copy repackaged production JAR from build stage
COPY --from=builder /build/target/smartattend-backend-0.0.1-SNAPSHOT.jar app.jar

# Production JVM optimizations for container environment
ENV SPRING_PROFILES_ACTIVE=prod \
    JAVA_OPTS="-XX:+UseG1GC -XX:MaxRAMPercentage=75.0 -XX:+ExitOnOutOfMemoryError"

EXPOSE 8080

ENTRYPOINT ["sh", "-c", "if [ -f /run/secrets/moodle_token ]; then export MOODLE_TOKEN=$(cat /run/secrets/moodle_token); fi; exec java $JAVA_OPTS -jar app.jar"]
