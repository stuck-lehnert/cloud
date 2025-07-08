package database

// func RowsToMaps(rows *sql.Rows) ([]map[string]any, error) {
// 	result := []map[string]any{}

// 	columns, err := rows.Columns()
// 	if err != nil {
// 		return nil, err
// 	}

// 	columnTypes, err := rows.ColumnTypes()
// 	if err != nil {
// 		return nil, err
// 	}

// 	for rows.Next() {
// 		rowData := map[string]any{}

// 		scans := make([]any, len(columns))
// 		scanPtrs := make([]any, len(scans))
// 		for i := range scans {
// 			scanPtrs[i] = &scans[i]
// 		}

// 		rows.Scan(scanPtrs...)

// 		for i, column := range columns {
// 			value := scans[i]

// 			switch strings.ToLower(columnTypes[i].DatabaseTypeName()) {
// 			case "json", "jsonb":
// 				if value == nil {
// 					break
// 				}

// 				var m any
// 				if err := json.Unmarshal(value.([]byte), &m); err != nil {
// 					return nil, err
// 				}

// 				value = m
// 			}

// 			rowData[column] = value
// 		}

// 		result = append(result, rowData)
// 	}

// 	return result, nil
// }
