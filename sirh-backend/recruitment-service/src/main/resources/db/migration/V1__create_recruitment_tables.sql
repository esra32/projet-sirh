-- Recruitment service schema

CREATE TABLE IF NOT EXISTS skills (
    id   BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS job_offers (
    id             BIGINT AUTO_INCREMENT PRIMARY KEY,
    title          VARCHAR(255) NOT NULL,
    description    TEXT,
    department     VARCHAR(255),
    location       VARCHAR(255),
    status         VARCHAR(50)  NOT NULL DEFAULT 'DRAFT',
    published_date DATE,
    deadline_date  DATE,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS job_offer_skills (
    job_offer_id BIGINT NOT NULL,
    skill_id     BIGINT NOT NULL,
    PRIMARY KEY (job_offer_id, skill_id),
    CONSTRAINT fk_jos_offer FOREIGN KEY (job_offer_id) REFERENCES job_offers (id) ON DELETE CASCADE,
    CONSTRAINT fk_jos_skill FOREIGN KEY (skill_id)     REFERENCES skills (id)     ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS applications (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    job_offer_id    BIGINT       NOT NULL,
    applicant_email VARCHAR(255) NOT NULL,
    applicant_name  VARCHAR(255) NOT NULL,
    cover_letter    TEXT,
    cv_url          VARCHAR(500),
    status          VARCHAR(50)  NOT NULL DEFAULT 'PENDING',
    applied_date    DATE,
    CONSTRAINT fk_app_offer FOREIGN KEY (job_offer_id) REFERENCES job_offers (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS application_skills (
    application_id BIGINT NOT NULL,
    skill_id       BIGINT NOT NULL,
    PRIMARY KEY (application_id, skill_id),
    CONSTRAINT fk_as_app   FOREIGN KEY (application_id) REFERENCES applications (id) ON DELETE CASCADE,
    CONSTRAINT fk_as_skill FOREIGN KEY (skill_id)        REFERENCES skills (id)       ON DELETE CASCADE
);
