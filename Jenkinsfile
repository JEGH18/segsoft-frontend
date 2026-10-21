// CI de segsoft-frontend en el Jenkins de p2tools (pi2tools.icesi.edu.co/jenkins).
// Equivale a .github/workflows/ci-frontend.yml: lint, tests unitarios y build de producción.
//
// Requiere en Jenkins: los plugins Pipeline, Docker Pipeline y JUnit, y un agente con Docker.
pipeline {
    agent {
        docker {
            image 'node:20'
            reuseNode true
        }
    }

    options {
        timeout(time: 20, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '20'))
        disableConcurrentBuilds()
    }

    environment {
        CI = 'true'
        // El usuario del agente no tiene HOME escribible dentro del contenedor.
        npm_config_cache = "${WORKSPACE}/.npm"
        // El pipeline no corre los e2e: no hace falta descargar el binario de Cypress.
        CYPRESS_INSTALL_BINARY = '0'
    }

    stages {
        stage('Dependencias') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Lint') {
            steps {
                sh 'npm run lint'
            }
        }

        stage('Tests unitarios') {
            steps {
                sh 'npx vitest run --reporter=default --reporter=junit --outputFile.junit=reports/junit.xml'
            }
        }

        stage('Build') {
            steps {
                sh 'npm run build'
            }
        }
    }

    post {
        always {
            junit testResults: 'reports/junit.xml', allowEmptyResults: true
        }
    }
}
