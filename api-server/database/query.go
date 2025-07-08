package database

import (
	"context"
	"database/sql"
	"encoding/json"
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

// func (i *Instance) QueryMaps(q sqlbuilder.Builder) ([]map[string]any, error) {
// 	query, args := BuildQuery(q)

// 	var maps []map[string]any = nil
// 	err := i.Use(func(conn *sql.Conn) error {
// 		rows, err := conn.QueryContext(context.TODO(), query, args...)
// 		if err != nil {
// 			return fmt.Errorf("Failed to query maps: %v", err)
// 		}

// 		maps, err = RowsToMaps(rows)
// 		if err != nil {
// 			return fmt.Errorf("Failed to execute RowsToMaps(..): %v", err)
// 		}

// 		return nil
// 	})

// 	if err != nil {
// 		return nil, err
// 	}

// 	return maps, nil
// }

func (i *Instance) QueryAsJson(q sqlbuilder.Builder) ([]map[string]any, error) {
	query, args := q.BuildWithFlavor(sqlbuilder.PostgreSQL)
	query = fmt.Sprintf("SELECT to_jsonb(q) FROM (%s) AS q", query)

	rawJsonRows := [][]byte{}
	err := i.Use(func(conn *sql.Conn) error {
		rows, err := conn.QueryContext(context.TODO(), query, args...)
		if err != nil {
			return err
		}

		for rows.Next() {
			var rawJson []byte
			if err := rows.Scan(&rawJson); err != nil {
				return err
			}

			rawJsonRows = append(rawJsonRows, rawJson)
		}

		return nil
	})

	if err != nil {
		return nil, fmt.Errorf("Failed to scan rows: %v", err)
	}

	result := make([]map[string]any, len(rawJsonRows))
	for i, rawJson := range rawJsonRows {
		if err := json.Unmarshal(rawJson, &result[i]); err != nil {
			return nil, fmt.Errorf("Failed to parse json: %v", err)
		}
	}

	return result, nil
}
