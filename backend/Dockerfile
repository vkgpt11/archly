FROM eclipse-temurin:17-jdk-alpine AS build
WORKDIR /workspace
RUN apk add --no-cache git
COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw -q -DskipTests dependency:go-offline
COPY src src
RUN ./mvnw -q clean package

FROM eclipse-temurin:17-jre-alpine
RUN addgroup -S archly && adduser -S archly -G archly
WORKDIR /app
COPY --from=build /workspace/target/archly-backend-*.jar app.jar
USER archly
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
