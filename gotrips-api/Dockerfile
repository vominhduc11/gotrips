
# Stage 1: Build Spring Boot
FROM eclipse-temurin:25-jdk AS builder

WORKDIR /app

# Maven Wrapper
COPY mvnw pom.xml ./
COPY .mvn ./.mvn

RUN chmod +x mvnw

# Cache Maven dependencies
RUN ./mvnw -B -DskipTests dependency:go-offline

# Copy source
COPY src ./src

# Build executable JAR
RUN ./mvnw -B -DskipTests package

# Stage 2: Runtime
FROM eclipse-temurin:25-jre-noble

WORKDIR /app

# Run as non-root user
RUN groupadd -r spring \
    && useradd -r -g spring spring

COPY --from=builder --chown=spring:spring /app/target/*.jar app.jar

USER spring

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
