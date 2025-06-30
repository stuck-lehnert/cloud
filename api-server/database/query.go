package database

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"github.com/huandu/go-sqlbuilder"
)

func BuildQuery(q sqlbuilder.Builder) (string, []any) {
	query, args := q.Build()

	count := 1
	for strings.Contains(query, "?") {
		query = strings.Replace(query, "?", fmt.Sprintf("$%d", count), 1)
		count += 1
	}

	return query, args
}

func (i *Instance) QueryMaps(q sqlbuilder.Builder) ([]map[string]any, error) {
	query, args := BuildQuery(q)

	fmt.Println(query)

	var maps []map[string]any = nil
	err := i.Use(func(conn *sql.Conn) error {
		rows, err := conn.QueryContext(context.TODO(), query, args...)
		if err != nil {
			return fmt.Errorf("Failed to query maps: %v", err)
		}

		maps, err = RowsToMaps(rows)
		if err != nil {
			return fmt.Errorf("Failed to execute RowsToMaps(..): %v", err)
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	return maps, nil
}
