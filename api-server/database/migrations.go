package database

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

type migration struct {
	name string
	sql  string
}

func (i *Instance) Migrate(direcory string) error {
	absDirectory, err := filepath.Abs(direcory)
	if err != nil {
		return fmt.Errorf("Failed to get abspath of '%s': %v", absDirectory, err)
	}

	stat, err := os.Stat(absDirectory)
	if err != nil {
		return fmt.Errorf("Failed to stat '%s': %v", absDirectory, err)
	}

	if !stat.IsDir() {
		return fmt.Errorf("Invalid migrations directory '%s': Is not a directory", absDirectory)
	}

	entries, err := os.ReadDir(absDirectory)
	if err != nil {
		return fmt.Errorf("Failed to list migration files: %v", err)
	}

	migrations := []*migration{}
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".sql") {
			continue
		}

		name := entry.Name()[:len(entry.Name())-4]
		if len(name) <= 0 {
			continue
		}

		path := filepath.Join(absDirectory, entry.Name())

		data, err := os.ReadFile(path)
		if err != nil {
			return fmt.Errorf("Failed to read file '%s'", path)
		}

		migrations = append(migrations, &migration{name, string(data)})
	}

	sort.Slice(migrations, func(i, j int) bool {
		return migrations[i].name < migrations[j].name
	})

	err = i.Use(func(conn *sql.Conn) error {
		_, err := conn.ExecContext(context.TODO(), `
			CREATE TABLE IF NOT EXISTS __migrations (
				name VARCHAR(127) NOT NULL PRIMARY KEY,
				timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
			);
		`)

		if err != nil {
			return fmt.Errorf("Failed to create table __migrations: %v", err)
		}

		rows, err := conn.QueryContext(context.TODO(), "SELECT name FROM __migrations;")
		if err != nil {
			return fmt.Errorf("Failed to get applied migrations: %v", err)
		}

		for rows.Next() {
			var name string
			if err := rows.Scan(&name); err != nil {
				return fmt.Errorf("Failed to scan row: %v", err)
			}

			for i, migration := range migrations {
				if migration != nil && migration.name == name {
					migrations[i] = nil
					break
				}
			}
		}

		return err
	})

	if err != nil {
		return err
	}

	todoMigrations := []*migration{}
	for _, migration := range migrations {
		if migration != nil {
			todoMigrations = append(todoMigrations, migration)
		}
	}

	err = i.Transact(func(tx *sql.Tx) error {
		for _, migration := range todoMigrations {
			_, err := tx.Exec(migration.sql)
			if err != nil {
				return fmt.Errorf("Failed to apply migration '%s': %v", migration.name, err)
			}

			_, err = tx.Exec("INSERT INTO __migrations (name) VALUES ($1);", migration.name)
			if err != nil {
				return fmt.Errorf("Failed to log applied migration '%s': %v", migration.name, err)
			}
		}

		return nil
	})

	if err != nil {
		return err
	}

	return nil
}
