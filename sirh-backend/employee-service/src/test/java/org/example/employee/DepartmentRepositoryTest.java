package org.example.employee;

import org.example.employee.model.Department;
import org.example.employee.repo.DepartmentRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.data.mongo.DataMongoTest;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

@DataMongoTest
@ActiveProfiles("test")
class DepartmentRepositoryTest {

    @Autowired
    DepartmentRepository repo;

    @Test
    void savesAndFindsById() {
        Department dept = new Department();
        dept.setName("Informatique");
        dept.setDescription("Service IT");
        Department saved = repo.save(dept);

        assertThat(repo.findById(saved.getId())).isPresent();
        assertThat(repo.existsByName("Informatique")).isTrue();
    }

    @Test
    void findByNameReturnsEmpty() {
        assertThat(repo.findByName("Inexistant")).isEmpty();
    }
}
