package com.threedanything;
import jakarta.persistence.*;
@Entity @Table(name="objects") public class ObjectEntity {
 @Id private String slug;
 @Column(nullable=false) private String category;
 @Column(nullable=false) private String nameEn;
 @Column(nullable=false) private String nameHi;
 @Column(columnDefinition="text",nullable=false) private String payload;
 protected ObjectEntity() {}
 public ObjectEntity(String slug,String category,String nameEn,String nameHi,String payload){this.slug=slug;this.category=category;this.nameEn=nameEn;this.nameHi=nameHi;this.payload=payload;}
 public String getSlug(){return slug;} public String getCategory(){return category;} public String getNameEn(){return nameEn;} public String getNameHi(){return nameHi;} public String getPayload(){return payload;}
}
