package com.threedanything;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
public interface ObjectRepository extends JpaRepository<ObjectEntity,String> {
 @Query("select o from ObjectEntity o where (:category is null or o.category = :category) and (:q is null or lower(o.payload) like lower(concat('%',:q,'%')))") List<ObjectEntity> search(@Param("category") String category,@Param("q") String q);
}
