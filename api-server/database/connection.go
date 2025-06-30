package database

import (
	"context"
	"database/sql"
	"fmt"

	_ "github.com/lib/pq"
)

type Instance struct {
	db *sql.DB
}

func Open(dsn string) (*Instance, error) {
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("Failed to open DB: %v", err)
	}

	db.SetMaxIdleConns(3)
	db.SetMaxOpenConns(10)

	err = db.Ping()
	if err != nil {
		db.Close()
		return nil, fmt.Errorf("Failed to ping DB: %v", err)
	}

	return &Instance{db}, nil
}

func (i *Instance) Use(callback func(conn *sql.Conn) error) error {
	conn, err := i.db.Conn(context.TODO())
	if err != nil {
		return fmt.Errorf("Failed to acquire connection: %v", err)
	}

	defer conn.Close()

	return callback(conn)
}
