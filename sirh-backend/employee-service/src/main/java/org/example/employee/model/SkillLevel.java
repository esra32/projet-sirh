package org.example.employee.model;

public enum SkillLevel {
    DEBUTANT(1), INTERMEDIAIRE(2), AVANCE(3), EXPERT(4);

    private final int value;

    SkillLevel(int value) { this.value = value; }

    public int getValue() { return value; }
}