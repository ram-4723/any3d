package com.threedanything;
import java.nio.file.*;
import java.io.InputStream;
import java.util.stream.Stream;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
@Configuration public class ApiConfig implements WebMvcConfigurer {
 @Value("${app.cors-origin}") private String origin;
 @Override public void addCorsMappings(CorsRegistry registry){registry.addMapping("/api/**").allowedOrigins(origin).allowedMethods("GET","OPTIONS");}
 @Bean CommandLineRunner seed(ObjectRepository repo,ObjectMapper mapper,@Value("${app.seed-dir:}") String dir){return args->{if(dir!=null&&!dir.isBlank()){Path path=Path.of(dir);if(Files.isDirectory(path))try(var files=Files.list(path)){for(Path f:files.filter(x->x.toString().endsWith(".json")).toList())save(f.toUri().toURL().openStream(),repo,mapper);}return;}Resource[] files=new PathMatchingResourcePatternResolver().getResources("classpath*:seed/*.json");for(Resource f:files)save(f.getInputStream(),repo,mapper);};}
 private void save(InputStream stream,ObjectRepository repo,ObjectMapper mapper)throws Exception{try(stream){JsonNode json=mapper.readTree(stream);String slug=json.path("slug").asText();if(!slug.matches("[a-z0-9]+(?:-[a-z0-9]+)*"))return;repo.save(new ObjectEntity(slug,json.path("category").asText(),json.path("name").path("en").asText(),json.path("name").path("hi").asText(),mapper.writeValueAsString(json)));}}
}
