FROM eclipse-temurin:17-jdk-alpine AS build
WORKDIR /app
# Copy parent POM from root and module sources
COPY pom.xml ./pom.xml
COPY recruitment-service/pom.xml ./recruitment-service/pom.xml
COPY recruitment-service/src ./recruitment-service/src
RUN apk add --no-cache maven && cd recruitment-service && mvn clean package -DskipTests

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/recruitment-service/target/*.jar app.jar
EXPOSE 8083
ENTRYPOINT ["java", "-jar", "app.jar"]