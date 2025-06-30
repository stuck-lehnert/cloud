package config

import (
	"fmt"
	"os"

	"github.com/joho/godotenv"
)

var dotEnvLoaded = false

func loadDotEnv() error {
	dotEnvLoaded = true

	if err := godotenv.Load(); err != nil {
		return fmt.Errorf("Failed to load .env: %v", err)
	}

	return nil
}

func forceGetEnv(key string) string {
	if !dotEnvLoaded {
		loadDotEnv()
	}

	value := os.Getenv(key)
	if len(value) <= 0 {
		panic(fmt.Errorf("env/%s not defined", key))
	}

	return value
}

func PostgresDSN() string {
	return forceGetEnv("POSTGRES_DSN")
}
