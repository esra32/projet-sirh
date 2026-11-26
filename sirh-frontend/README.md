# SirhFrontend

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 17.3.17.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.



sujet : Résumé du Projet de Fin d’Études

Ce projet de fin d’études vise à concevoir et mettre en œuvre une application moderne basée sur une architecture microservices, tout en exploitant ses données à travers une infrastructure complète de Business Intelligence (BI).

La première partie du projet consiste à développer une plateforme de gestion des ressources humaines (SIRH) en utilisant Angular pour le frontend et Spring Boot / Spring Cloud pour le backend. L’application est organisée en microservices indépendants (authentification, gestion des employés, recrutement interne, mobilité), interconnectés via une API Gateway sécurisée par JWT. Elle offre des espaces dédiés aux employés, managers et administrateurs RH, permettant la gestion des profils, des postes internes, des candidatures, des performances et des statistiques RH.

La seconde partie du projet porte sur la mise en place d’une solution Business Intelligence permettant d’analyser et de valoriser les données issues de l’application. Elle inclut la conception d’un Data Warehouse, la mise en œuvre de processus ETL, la modélisation dimensionnelle (schéma en étoile), ainsi que la création de tableaux de bord interactifs et de rapports analytiques. Des analyses avancées (KPIs RH, tendances, mobilité, turnover, prévisions) sont réalisées afin d’aider à la prise de décision stratégique.

Email	Mot de passe	Rôle
employee@sirh.com	Employee@123	EMPLOYEE
manager@sirh.com	Manager@123	MANAGER
rhadmin@sirh.com	RhAdmin@123	HR_ADMIN

Ce projet permet ainsi de maîtriser l’ensemble du cycle de vie d’une application moderne, depuis le développement logiciel jusqu’à l’analyse décisionnelle, tout en combinant des compétences en génie logiciel, architectures distribuées et data analytics.