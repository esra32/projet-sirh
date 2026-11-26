package org.example.employee;

import org.example.employee.dto.DepartmentDTO;
import org.example.employee.exception.ResourceNotFoundException;
import org.example.employee.model.Department;
import org.example.employee.repo.DepartmentRepository;
import org.example.employee.service.DepartmentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DepartmentServiceTest {

    @Mock DepartmentRepository repo;
    @InjectMocks DepartmentService service;

    Department dept;

    @BeforeEach
    void setUp() {
        dept = new Department();
        dept.setId("DEPT1");
        dept.setName("RH");
    }

    @Test
    void findAllReturnsList() {
        when(repo.findAll()).thenReturn(List.of(dept));
        List<DepartmentDTO> result = service.findAll();
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getName()).isEqualTo("RH");
    }

    @Test
    void findByIdNotFoundThrows() {
        when(repo.findById("99")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.findById("99"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void createPersistsAndReturnsDto() {
        when(repo.existsByName("Comptabilité")).thenReturn(false);
        Department toSave = new Department();
        toSave.setId("DEPT2");
        toSave.setName("Comptabilité");
        when(repo.save(any())).thenReturn(toSave);

        DepartmentDTO dto = new DepartmentDTO();
        dto.setName("Comptabilité");
        DepartmentDTO created = service.create(dto);
        assertThat(created.getName()).isEqualTo("Comptabilité");
    }
}
