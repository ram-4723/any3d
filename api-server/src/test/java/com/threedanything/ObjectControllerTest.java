package com.threedanything;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
@SpringBootTest @AutoConfigureMockMvc class ObjectControllerTest {
 @Autowired MockMvc mvc;
 @Test void listsSeededObjects() throws Exception { mvc.perform(get("/api/objects")).andExpect(status().isOk()).andExpect(jsonPath("$[0].slug").exists()); }
 @Test void rejectsUnknownCategory() throws Exception { mvc.perform(get("/api/objects").param("category","unknown")).andExpect(status().isBadRequest()); }
 @Test void returnsNotFoundForMissingSlug() throws Exception { mvc.perform(get("/api/objects/not-real")).andExpect(status().isNotFound()); }
}
