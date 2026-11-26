package org.example.recruitment.exception;

public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String resource, Object id) {
        super(resource + " introuvable with id : " + id);
    }
    public ResourceNotFoundException(String message) {
        super(message);
    }
}
