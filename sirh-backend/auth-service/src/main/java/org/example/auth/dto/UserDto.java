package org.example.auth.dto;

import java.util.Set;

public class UserDto {
    private String id;
    private String email;
    private Set<String> roles;

    public UserDto() {}

    public UserDto(String id, String email, Set<String> roles) {
        this.id = id;
        this.email = email;
        this.roles = roles;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public Set<String> getRoles() { return roles; }
    public void setRoles(Set<String> roles) { this.roles = roles; }
}
