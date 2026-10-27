package com.threedanything;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
@RestController @RequestMapping("/api") public class ObjectController {
 private final ObjectRepository repository; private final ObjectMapper mapper;
 public ObjectController(ObjectRepository repository,ObjectMapper mapper){this.repository=repository;this.mapper=mapper;}
 @GetMapping("/objects") public List<JsonNode> all(@RequestParam(required=false) String category,@RequestParam(required=false) String q){if(category!=null&&!Set.of("cars-bikes","machines","landmarks","nature").contains(category))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Unknown category");return repository.search(category,blank(q)).stream().map(this::json).toList();}
 @GetMapping("/objects/{slug}") public JsonNode one(@PathVariable String slug){return repository.findById(slug).map(this::json).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Object not found"));}
 @GetMapping("/compare") public Map<String,Object> compare(@RequestParam String a,@RequestParam String b){return Map.of("a",one(a),"b",one(b));}
 @GetMapping("/categories") public List<Map<String,String>> categories(){return List.of("cars-bikes","machines","landmarks","nature").stream().map(s->Map.of("slug",s,"name",s)).toList();}
 private String blank(String s){return s==null||s.isBlank()?null:s.trim();}
 private JsonNode json(ObjectEntity e){try{return mapper.readTree(e.getPayload());}catch(Exception ex){throw new IllegalStateException("Invalid stored JSON for "+e.getSlug(),ex);}}
}
