-- Employee service schema

CREATE TABLE IF NOT EXISTS departments (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(255) NOT NULL UNIQUE,
    description VARCHAR(1000)
);

CREATE TABLE IF NOT EXISTS positions (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    title         VARCHAR(255) NOT NULL,
    description   VARCHAR(1000),
    department_id BIGINT,
    CONSTRAINT fk_position_dept FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS employees (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    first_name    VARCHAR(100) NOT NULL,
    last_name     VARCHAR(100) NOT NULL,
    email         VARCHAR(255) NOT NULL UNIQUE,
    phone         VARCHAR(50),
    hire_date     DATE,
    department_id BIGINT,
    position_id   BIGINT,
    contract_type VARCHAR(50),
    CONSTRAINT fk_emp_dept     FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE SET NULL,
    CONSTRAINT fk_emp_position FOREIGN KEY (position_id)   REFERENCES positions (id)  ON DELETE SET NULL
);
