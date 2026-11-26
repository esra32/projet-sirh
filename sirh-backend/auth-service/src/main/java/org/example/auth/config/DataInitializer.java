package org.example.auth.config;

import org.example.auth.model.Role;
import org.example.auth.model.User;
import org.example.auth.repo.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Set;

@Configuration
public class DataInitializer {

    @Bean
    CommandLineRunner initDatabase(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            int created = 0;

            // 1. HR Admin
            if (!userRepository.existsByEmail("admin@hr.sirh.com")) {
                User hrAdmin = new User();
                hrAdmin.setEmail("admin@hr.sirh.com");
                hrAdmin.setPassword(passwordEncoder.encode("admin123"));
                hrAdmin.setRoles(Set.of(Role.HR_ADMIN));
                userRepository.save(hrAdmin);
                created++;
            }

            // 2. Manager
            if (!userRepository.existsByEmail("manager@mgr.sirh.com")) {
                User manager = new User();
                manager.setEmail("manager@mgr.sirh.com");
                manager.setPassword(passwordEncoder.encode("manager123"));
                manager.setRoles(Set.of(Role.MANAGER));
                userRepository.save(manager);
                created++;
            }

            // 3. Employee (Dev)
            if (!userRepository.existsByEmail("employee@sirh.com")) {
                User employee = new User();
                employee.setEmail("employee@sirh.com");
                employee.setPassword(passwordEncoder.encode("employee123"));
                employee.setRoles(Set.of(Role.EMPLOYEE));
                userRepository.save(employee);
                created++;
            }

            // 4. Employee (Designer)
            if (!userRepository.existsByEmail("karim.design@sirh.com")) {
                User designer = new User();
                designer.setEmail("karim.design@sirh.com");
                designer.setPassword(passwordEncoder.encode("karim123"));
                designer.setRoles(Set.of(Role.EMPLOYEE));
                userRepository.save(designer);
                created++;
            }

            // 5. Employee (Data Analyst)
            if (!userRepository.existsByEmail("lea.data@sirh.com")) {
                User analyst = new User();
                analyst.setEmail("lea.data@sirh.com");
                analyst.setPassword(passwordEncoder.encode("lea123"));
                analyst.setRoles(Set.of(Role.EMPLOYEE));
                userRepository.save(analyst);
                created++;
            }

            // 6. Employee (Junior Dev)
            if (!userRepository.existsByEmail("youssef.dev@sirh.com")) {
                User junior = new User();
                junior.setEmail("youssef.dev@sirh.com");
                junior.setPassword(passwordEncoder.encode("youssef123"));
                junior.setRoles(Set.of(Role.EMPLOYEE));
                userRepository.save(junior);
                created++;
            }

            // 7. Employee (Marketing)
            if (!userRepository.existsByEmail("clara.mkt@sirh.com")) {
                User marketing = new User();
                marketing.setEmail("clara.mkt@sirh.com");
                marketing.setPassword(passwordEncoder.encode("clara123"));
                marketing.setRoles(Set.of(Role.EMPLOYEE));
                userRepository.save(marketing);
                created++;
            }

            // 8. Second Manager
            if (!userRepository.existsByEmail("nadia.mgr@sirh.com")) {
                User manager2 = new User();
                manager2.setEmail("nadia.mgr@sirh.com");
                manager2.setPassword(passwordEncoder.encode("nadia123"));
                manager2.setRoles(Set.of(Role.MANAGER));
                userRepository.save(manager2);
                created++;
            }

            if (created > 0) {
                System.out.println("✅ " + created + " utilisateur(s) créé(s) dans la base de données.");
            } else {
                System.out.println("ℹ️ Tous les utilisateurs existent déjà.");
            }
        };
    }
}
