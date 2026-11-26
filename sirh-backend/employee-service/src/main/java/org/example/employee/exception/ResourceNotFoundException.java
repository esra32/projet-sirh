package org.example.employee.exception;

public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String resource, Object id) {
        super(resource + " introuvable avec l'id : " + id);
    }
    public ResourceNotFoundException(String message) {
        super(message);
    }
}
